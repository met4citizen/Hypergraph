import { HypervectorSet } from "./HypervectorSet.mjs";

/**
* @class Projective branchial coordinates related to quantum phase
* @author Mika Suominen
*/
class Phase {

  /**
  * Creates an instance of Phase.
  * @constructor
  * @param {Object} G Graph object.
  */
  constructor( G ) {
    this.G = G; // Graph object
    this.ham = new HypervectorSet(); // Hyperdimensional Associative Memory

    this.timerid = null; // Timer
    this.svddelay = 50; // Timer delay in msec
    this.progressfn = null; // Callback for rewrite progress
    this.finishedfn = null; // Callback for rewrite finished

    this.progress = { // Real-time statistics about svd process
      progress: 0,
      dm: 0,
      nodes: 0
    };
    this.interrupt = false; // If true, user stopped the svd process
	}

  /**
  * Singular Value Decomposition.
  *
  * The following method is adapted from a GitHub project stardisblue/svdjs,
  * which is licensed under:
  *
  * MIT License
  *
  * Copyright (c) 2018 stardisblue
  *
  * Permission is hereby granted, free of charge, to any person obtaining a copy
  * of this software and associated documentation files (the "Software"), to deal
  * in the Software without restriction, including without limitation the rights
  * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  * copies of the Software, and to permit persons to whom the Software is
  * furnished to do so, subject to the following conditions:
  *
  * The above copyright notice and this permission notice shall be included in all
  * copies or substantial portions of the Software.
  *
  * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  * SOFTWARE.
  *
  * @generator
  */
  *svd() {
    let withu = true;
    let withv = false; // We don't need v, so we do not calculate it

    let eps = Math.pow(2, -52);
    const tol = 1e-64 / eps;

    const n = this.G.nodes.length;
    const m = n;

    if ( m === 0 ) return; // No nodes

    let l1, c, f, h, s, y, z;

    let l = 0, g = 0, x = 0;
    const e = [];

    // Init u,q,v
    const u = new Array(m).fill().map( x => new Array(n).fill(0) );
    const v = withv ? new Array(n).fill().map(x => new Array(n).fill(0)) : [];
    const q = new Array(n).fill(0);

    // Calculate u (distance matrix)
    for( let i=0; i<m; i++ ) {
      for( let j=i+1; j<m; j++ ) {
        let d = this.ham.d( this.G.nodes[i].bc, this.G.nodes[j].bc );
        if ( d > 5120 ) d = 10240 - d;
        d = d / 10;
        u[i][j] = d;
        u[j][i] = d;
      }
      if ( this.interrupt ) return;
      if ( i % 10 === 0 ) {
        this.progress.dm  = i;
        yield;
      }
    }

    this.progress.dm  = m;
    yield;

    for (let i = 0; i < n; i++) {
      e[i] = g;
      s = 0;
      l = i + 1;
      for (let j = i; j < m; j++) {
        s += Math.pow(u[j][i], 2);
      }
      if (s < tol) {
        g = 0;
      } else {
        f = u[i][i];
        g = f < 0 ? Math.sqrt(s) : -Math.sqrt(s);
        h = f * g - s;
        u[i][i] = f - g;
        for (let j = l; j < n; j++) {
          s = 0;
          for (let k = i; k < m; k++) {
            s += u[k][i] * u[k][j];
          }
          f = s / h;
          for (let k = i; k < m; k++) {
            u[k][j] = u[k][j] + f * u[k][i];
          }
        }
      }
      q[i] = g;
      s = 0;
      for (let j = l; j < n; j++) {
        s += Math.pow(u[i][j], 2);
      }
      if (s < tol) {
        g = 0;
      } else {
        f = u[i][i + 1];
        g = f < 0 ? Math.sqrt(s) : -Math.sqrt(s);
        h = f * g - s;
        u[i][i + 1] = f - g;
        for (let j = l; j < n; j++) {
          e[j] = u[i][j] / h;
        }
        for (let j = l; j < m; j++) {
          s = 0;
          for (let k = l; k < n; k++) {
            s += u[j][k] * u[i][k];
          }
          for (let k = l; k < n; k++) {
            u[j][k] = u[j][k] + s * e[k];
          }
        }
      }
      y = Math.abs(q[i]) + Math.abs(e[i]);
      if (y > x) {
        x = y;
      }
    }

    // Accumulation of right-hand transformations
    if (withv) {
      for (let i = n - 1; i >= 0; i--) {
        if (g !== 0) {
          h = u[i][i + 1] * g;
          for (let j = l; j < n; j++) {
            v[j][i] = u[i][j] / h;
          }
          for (let j = l; j < n; j++) {
            s = 0;
            for (let k = l; k < n; k++) {
              s += u[i][k] * v[k][j];
            }
            for (let k = l; k < n; k++) {
              v[k][j] = v[k][j] + s * v[k][i];
            }
          }
        }
        for (let j = l; j < n; j++) {
          v[i][j] = 0;
          v[j][i] = 0;
        }
        v[i][i] = 1;
        g = e[i];
        l = i;
      }
    }

    // Accumulation of left-hand transformations
    if (withu) {
      for (let i = n - 1; i >= 0; i--) {
        l = i + 1;
        g = q[i];
        for (let j = l; j < n; j++) {
          u[i][j] = 0;
        }
        if (g !== 0) {
          h = u[i][i] * g;
          for (let j = l; j < n; j++) {
            s = 0;
            for (let k = l; k < m; k++) {
              s += u[k][i] * u[k][j];
            }
            f = s / h;
            for (let k = i; k < m; k++) {
              u[k][j] = u[k][j] + f * u[k][i];
            }
          }
          for (let j = i; j < m; j++) {
            u[j][i] = u[j][i] / g;
          }
        } else {
          for (let j = i; j < m; j++) {
            u[j][i] = 0;
          }
        }
        u[i][i] = u[i][i] + 1;
      }
    }

    // Diagonalization of the bidiagonal form
    let start = Date.now();
    eps = eps * x;
    let testConvergence;
    for (let k = n - 1; k >= 0; k--) {
      for (let iteration = 0; iteration < 50; iteration++) {
        // test-f-splitting
        testConvergence = false;
        for (l = k; l >= 0; l--) {
          if (Math.abs(e[l]) <= eps) {
            testConvergence = true;
            break;
          }
          if (Math.abs(q[l - 1]) <= eps) {
            break;
          }
        }

        if (!testConvergence) {
          // cancellation of e[l] if l>0
          c = 0;
          s = 1;
          l1 = l - 1;
          for (let i = l; i < k + 1; i++) {
            f = s * e[i];
            e[i] = c * e[i];
            if (Math.abs(f) <= eps) {
              break; // goto test-f-convergence
            }
            g = q[i];
            q[i] = Math.sqrt(f * f + g * g);
            h = q[i];
            c = g / h;
            s = -f / h;
            if (withu) {
              for (let j = 0; j < m; j++) {
                y = u[j][l1];
                z = u[j][i];
                u[j][l1] = y * c + z * s;
                u[j][i] = -y * s + z * c;
              }
            }
          }
        }

        // test f convergence
        z = q[k];
        if (l === k) {
          // convergence
          if (z < 0) {
            // q[k] is made non-negative
            q[k] = -z;
            if (withv) {
              for (let j = 0; j < n; j++) {
                v[j][k] = -v[j][k];
              }
            }
          }
          break; // break out of iteration loop and move on to next k value
        }

        // Shift from bottom 2x2 minor
        x = q[l];
        y = q[k - 1];
        g = e[k - 1];
        h = e[k];
        f = ((y - z) * (y + z) + (g - h) * (g + h)) / (2 * h * y);
        g = Math.sqrt(f * f + 1);
        f = ((x - z) * (x + z) + h * (y / (f < 0 ? f - g : f + g) - h)) / x;

        // Next QR transformation
        c = 1;
        s = 1;
        for (let i = l + 1; i < k + 1; i++) {
          g = e[i];
          y = q[i];
          h = s * g;
          g = c * g;
          z = Math.sqrt(f * f + h * h);
          e[i - 1] = z;
          c = f / z;
          s = h / z;
          f = x * c + g * s;
          g = -x * s + g * c;
          h = y * s;
          y = y * c;
          if (withv) {
            for (let j = 0; j < n; j++) {
              x = v[j][i - 1];
              z = v[j][i];
              v[j][i - 1] = x * c + z * s;
              v[j][i] = -x * s + z * c;
            }
          }
          z = Math.sqrt(f * f + h * h);
          q[i - 1] = z;
          c = f / z;
          s = h / z;
          f = c * g + s * y;
          x = -s * g + c * y;
          if (withu) {
            for (let j = 0; j < m; j++) {
              y = u[j][i - 1];
              z = u[j][i];
              u[j][i - 1] = y * c + z * s;
              u[j][i] = -y * s + z * c;
            }
          }
        }
        e[l] = 0;
        e[k] = f;
        q[k] = x;
      }

      // Interrupt of yield
      if ( this.interrupt ) return;

      if ( ( n-k ) % 10 === 0 ) {
        this.progress.nodes  = n - k;
        yield;
      }

    }

    let xsum = 0;
    let ysum = 0;
    let zsum = 0;
    for (let i = 0; i < n; i++) {
      // Number below eps should be zero
      if (q[i] < eps) q[i] = 0;

      this.G.nodes[i].bx = u[i][0] * q[0];
      this.G.nodes[i].by = u[i][1] * q[1];
      this.G.nodes[i].bz = u[i][2] * q[2];
      xsum += this.G.nodes[i].bx;
      ysum += this.G.nodes[i].by;
      zsum += this.G.nodes[i].bz;
    }

    let dx = xsum/n;
    let dy = ysum/n;
    let dz = zsum/n;
    for (let i = 0; i < n; i++) {
      this.G.nodes[i].bx -= dx;
      this.G.nodes[i].by -= dy;
      this.G.nodes[i].bz -= dz;
    }



  }

  /**
  * Timer.
  * @param {Object} g Generator for svd
  */
  timer(g) {
    if ( g.next().done ) {
      this.interrupt = false;
      if ( this.finishedfn ) {
        this.finishedfn();
      }
    } else {
      if ( this.progressfn ) {
        this.progress.progress = this.progress.dm / this.G.nodes.length / 2 + this.progress.nodes / this.G.nodes.length / 2 ;
        this.progressfn( this.progress );
      }
      this.timerid = setTimeout( this.timer.bind(this), this.svddelay, g );
    }
  }

  /**
  * Multidimensional scaling.
  * @param {Object} graph Graph object
  * @param {progressfn} [progressfn=null] Progress update callback function
	* @param {finishedfn} [finishedfn=null] Rewriting finished callback function
  */
  run( progressfn = null, finishedfn = null ) {

		// Set parameters
		this.interrupt = false;
		this.progressfn = progressfn;
		this.finishedfn = finishedfn;

    // Clear stat
    this.progress.progress = 0;
    this.progress.dm = 0;
    this.progress.nodes = 0;

		// Start singular value decomposition process
    // timeout if either of the callback fns set
		let g = this.svd();
		if ( this.progressfn || this.finishedfn ) {
			this.timerid = setTimeout( this.timer.bind(this), this.svddelay, g );
		} else {
			while ( !g.next().done );
		}
	}

	/**
	* Cancel rewriting process.
	*/
	cancel() {
		this.progress.user = "Stopping...";
		this.interrupt = true;
	}

}

export { Phase };
