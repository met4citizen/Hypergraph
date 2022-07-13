import { HDC } from "./HDC.mjs";
import { Rewriter } from "./Rewriter.mjs";

/**
* @class The space of all rewriting rules.
* @author Mika Suominen
* @author Tuomas Sorakivi
*/
class Rulial {

  /**
  * Creates an instance of Rulial.
  * @constructor
  */
  constructor() {
    this.rules = []; // rewriting rules
    this.commands = []; // commands
    this.initial = []; // initial graphs
  }

  /**
  * Clear the Rulial for reuse.
  */
  clear() {
    this.rules.length = 0; // rewriting rules
    this.commands.length = 0; // commands
    this.initial.length = 0; // initial graphs
  }

  /**
  * Parse command string (can be ; separated)
  * @static
  * @param {string} str
  * @return {Object[]} [ { cmd: "", params: ["1","2"] }, ... ]
  */
  static parseCommands( str ) {
    // Extract quoted strings
    let req = /(["'])((?:\\\1|(?:(?!\1)).)*)(\1)/g;
    let q = str.match( req ) || [];
    let qfn = () => { return q.shift(); };

    str = str.replace( req, "''" ).toLowerCase()
    .replace( /\}\}\,\{\{/g, "}};{{")
    .replace( /\{|\[/g , "(" ).replace( /}|]/g , ")" )
    .replace( /(\()+/g , "(" ).replace( /(\))+/g , ")" )
    .replace( /(;)+/g , ";" ).replace( /;$/g ,"" )
    .replace( /[^()a-z0-9,=;>\.\-\\\/'%]+/g , "" );

    let cs = [];
    str.split(";").forEach( s => {
      let x = s.match( /^([^(]+)/ );
      let c = x ? x[0] : "";
      let ps = [], opt = "";
      if ( c === '' ) {
        x = s.match( /\/([^/]*)$/ );
        opt = x ? x[1] : "";
        if (opt.length) s = s.slice(0, -(opt.length+1) );
        ps.push( s.replace( /''/g, qfn ) );
      } else {
        x = s.match( /\/([^/]*)$/ );
        opt = x ? x[1] : "";
        x = s.match( /\((.*)\)/s );
        if ( x && x[1].length ) {
          ps = x[1].split(",").map( t => t.replace( /''/g, qfn ) );
        }
      }
      cs.push( { cmd: c, params: ps, opt: opt } );
    });

    return cs;
  }

  /**
  * Parse rules.
  * @static
  * @param {string[]} str Array of rule strings
  * @return {Object[]} [ { lhs, rhs, neg, delmask, addmask}, ... ]
  */
  static parseRules( str ) {
    const rules = [];
    let sfn = (e) => { return e.split(","); };
    let jfn = (e) => { return e.join(","); };

    str.forEach( s => {
      let c = s.toLowerCase()
      .replace( /\{|\[/g , "(" ).replace( /}|]/g , ")" )
      .replace( /(\()+/g , "(" ).replace( /(\))+/g , ")" )
      .replace( /(;)+/g , ";" ).replace( /;$/g ,"" )
      .replace( /(=)+/g , "=" ).replace( /[^()a-z0-9,=;>\\\/]+/g , "" );

      let o = [ [], [], [],[] ]; // lhs, rhs, lhsneg, rhsneg
      let i = 0, rhs = 0, neg = 0, twoway = false;
      while ( i < c.length ) {
        switch( c[i] ) {
          case '(':
            let x = c.substring(i).match( /\(([^)]+)\)/s );
            if ( x ) {
              o[ neg + rhs ].push(x[1]);
              i += x[0].length - 1;
            }
            break;
          case '\\': neg = 2; break;
          case '=': twoway = true;
          case '>': neg = 0; rhs = 1;
        }
        i++;
      }
      if ( rhs ) {
        const r = { lhs: o[0].map( sfn ),rhs: o[1].map( sfn ) };
        if ( o[2].length ) r.neg = o[2].map( sfn );
        rules.push( r );
        if ( twoway ) {
          const r2 = { lhs: o[1].map( sfn ), rhs: o[0].map( sfn ) };
          if ( o[3].length ) r2.neg = o[3].map( sfn );
          rules.push( r2 );
        }
      }
    });

    // Post-process
    for( let i=rules.length-1; i >=0; i-- ) {
      let r = rules[i];

      // Normalize
      const u = [ ...new Set( Object.values(r).flat().flat() ) ];
      Object.keys(r).forEach( k => {
        for( let j=0; j < r[k].length; j++ ) {
          for( let l=0; l < r[k][j].length; l++) r[k][j][l] = u.indexOf( r[k][j][l] );
        }
      });

      // Map templates
      r.lhsmap = [...new Set( r.lhs.flat() )].fill( -1 );
      if ( r.neg ) r.negmap = [...new Set( [...r.lhs.flat(),...r.neg.flat()])].fill( -1 );
      let lhsall = r.lhs.map( e => e.join(","));
      let rhsall = r.rhs.map( e => e.join(","));
      r.lhsdup = lhsall.map( e => rhsall.includes(e) );
      r.rhsdup = rhsall.map( e => lhsall.includes(e) );

      // Calculate physical Values
      r.energy = r.lhs.length + r.rhs.length; // Hypothesis: energy is # of edges
      let maxlhsv = r.lhsmap.length - 1;
      let masses = r.rhs.filter( e => e.every( v => v <= maxlhsv ) );
      let massratio = masses.length ? (masses.length / r.rhs.length) : 1;
      r.mass = r.energy * massratio;
  		r.momentum = r.energy * ( 1 - massratio );
      let lhsrevs = r.lhs.map( e => e.slice().reverse().join(",") );
      r.spin = lhsrevs.reduce( (a,b) => a + rhsall.includes(b) ? 1 : 0, 0 );

      // Branchial coordinate (basis)
      r.bc = HDC.random();

    }

    return rules;
  }


  /**
  * Return euclidean distance between two points in n-dimension
  * @param {number} a Coordinates for point A
  * @param {number} b Coordinates for point B
  * @return {number} Distance.
  */
  static d(a,b) {
    let sum = 0;
    for (let i = a.length - 1; i >= 0; i--) {
      sum += Math.pow(a[i] - b[i], 2);
    }
    return Math.sqrt(sum);
  }

  /**
  * Return the distance of two points on a Fibonacci sphere radius = 1
  * @param {number} i Index of point 1
  * @param {number} j Index of point 2
  * @param {number} n Total number of points 1
  * @param {number} m Total number of points 2
  * @return {number} Distance on a unit sphere
  */
  static fibonacciD(i, j, n, m) {
    // Point on a spherical Fibonacci lattice
    function p(x,n) {
      let phi = Math.PI * (3.0 - Math.sqrt(5.0))  // golden angle in radians
      let y = 1 - ( x / (n-1)) * 2;
      let d = Math.sqrt( 1 - y*y );
      return [ Math.cos(phi*x)*d, y ,Math.sin(phi*x)*d ];
    }
    return Rulial.d( p(i,n), p(j,m) );
  }


  /**
  * Creates a graph from sprinkled points in n-dimensional euclidean space
  * @param {number[][]} manifold Array of point coordinates
  * @param {number} distance Distance limit
  * @return {number[][]} Edges
  */
  manifoldToGraph( manifold, distance = 1.01 ) {
    let edges = [];
    for ( let i = manifold.length-1; i>0; i--) {
      for( let j = i-1; j>=0; j-- ) {
        if ( Math.abs( Rulial.d( manifold[i], manifold[j] )) < distance ) {
          // Random direction of the edge
          Math.random() > 0.5 ? edges.push( [i,j] ) : edges.push( [j,i] );
        }
      }
    }
    return edges;
  }

  /**
  * Produces a random sprinkling of points
  * @param {number} n Number of vertices
  * @return {number[][]} Edges
  */
  points( n ) {
    if ( (n < 1) || (n > 10000) )
      throw new RangeError("[Points] Number of points must be between 1-10000.");
    return new Array(n).fill().map((_,i) => [i]);
  }

  /**
  * Produces a random sprinkling of points into a flat grid of
  * given dimension and number of vertices.
  * @param {number[]} ls Arrays of edge sizes [ dx, dy, dz, ... ]
  * @return {number[][]} Edges
  */
  grid( ls ) {
    let n = ls.reduce( (a,b) => a * b, 1);
    if ( (n < 1) || (n > 10000) )
      throw new RangeError("[Grid] Number of points must be between 1-10000.");

    let sizes = ls.reduce( (a,x,i,arr) => {
      a.push( i ? a[i-1]*arr[i-1] : 1 );
      return a;
    }, []);

    let manifold = Array(n).fill().map( (_,i) => {
      return sizes.map( (s,j) => Math.floor( i / s ) % ls[j] );
    });

    return this.manifoldToGraph( manifold );
  }

  /**
  * Produces a random graph of n vertices using sprinkling
  * @param {number} n Number of vertices
  * @param {number} dimension Mininum number of edges per vertix
  * @param {number} connections Mininum number of edges per vertix
  * @param {number} mode Mode, 0=n-cube, 1=n-ball
  * @param {number} exp If TRUE use exponential distribution
  * @return {number[][]} Edges
  */
  random( n, dimension, connections ) {
    if ( (n < 10) || (n > 1000) )
      throw new RangeError("[Random] Number of points must be between 10-1000.");
    if ( (dimension < 1) || (dimension > 20) )
      throw new RangeError("[Random] Dimension must be between 1-20.");
    if ( (connections < 1) || (connections > 100) )
      throw new RangeError("[Random] Connections must be between 1-100.");

    // Sprinkling
    let points = [];
    let alledges = [];
    let origo = Array( dimension ).fill(0);
    for ( let i = 0; i < n; i++ ) {
      // Random point; if mode==1 filter out points outside the n-ball
      let point = Array( dimension ).fill().map(() => 2 * Math.random() - 1 );
      points.push( point );

      // All possible edges using random direction
      for ( let j = 0; j < i; j++ ) {
        let dist = Rulial.d( points[i], points[j] );
        let edge = Math.random() > 0.5 ? [i,j] : [j,i]; // Random direction
        alledges.push( { edge: edge, dist: dist } );
      }
    }

    // Sort, min length first
    alledges.sort( (a,b) => a.dist - b.dist );

    // Ensure all vertices get at least two links
    let linkcnt = Array(n).fill(0);
    let edges = [];
    for ( let i = 0; i < alledges.length; i++ ) {
      let a = alledges[i].edge[0];
      let b = alledges[i].edge[1];
      if ( (linkcnt[ a ] < connections ) && (linkcnt[ b ] < connections ) ) {
        linkcnt[ a ]++; linkcnt[ b ]++;
        edges.push( [ a,b ]);
      }
    }

    return edges;
  }

  /**
  * Produces a complete graph with n vertices
  * @param {number} n Number of vertices
  * @param {number} d The number of egdes between vertices
  * @param {number} surface If true, connect only the surface
  * @return {number[][]} Edges
  */
  complete( n, d = 1, surface = false ) {
    let fibDistRef = 0.0; // Reference distance on a Fibonacci sphere
    if ( surface ) {
      fibDistRef = 1.1 * Rulial.fibonacciD(1,2,n,n);
      if ( (n < 5) || (n > 1000) )
        throw new RangeError("[Sphere] Number of vertices must be between 5-1000.");
    } else {
      if ( (n < 1) || (n > 100) )
        throw new RangeError("[Complete] Number of vertices must be between 1-100.");
    }

    let edges = [];
    let v = n;
    for( let i=0; i<n-1; i++ ) {
      for( let j=i+1; j<n; j++ ) {
        // Continue if the points are not near each other on a surface of a sphere
        if ( surface && Rulial.fibonacciD(i,j,n,n) > fibDistRef ) continue;

        // Random direction of the edge
        let [ a,b ] = Math.random() > 0.5 ? [i,j] : [j,i];

        let c = [ a, ...Array(d-1).fill().map( x => v++ ), b ];
        for( let k = 0; k < c.length-1; k++ ) {
          edges.push( [ c[k], c[k+1 ] ] );
        }
      }
    }

    return edges;
  }

  /**
  * Produces initial graph from rule.
  * @param {string} str Rule string
  * @param {number} n Maximum number of events.
  * @return {number[][]} Edges
  */
  rule( str, n ) {
    if ( (n < 10) || (n > 1000) )
      throw new RangeError("[Rule] Max # of events must be between 10-1000.");

    // Run the given rule in singleway spacelike mode for n events
    let h = new Rewriter();
    h.run( str, {
      evolution: 1,
      interactions: 1,
      maxevents: n,
      deduplicate: false,
      merge: false,
      pathcnts: false,
			bcoordinates: false,
      knn: 0
    });
    let leafs = h.multiway.T.filter( t => t.child.length === 0 ).map( t => t.edge );

    return leafs;
  }

  /**
  * Parse rule/command from a string.
  * @param {string} str Rule/command string
  */
  setRule( str ) {
    // Reset
    this.clear();

    // Check if empty
    if ( str.length === 0 ) throw new RangeError("Given rule is empty.");

    // Parse commands and rules
    [ this.rules, this.commands ] = Rulial.parseCommands( str ).reduce( (a,b) => {
      if ( b.cmd === '' ) {
        let r = Rulial.parseRules( b.params );
        if ( r.length ) {
          r.forEach( x => x.opt = b.opt );
          a[0].push( ...r ); // rule
        } else {
          a[1].push(b); // initial state
        }
      } else {
        a[1].push(b); // command
      }
      return a;
    }, [[],[]]);

    // Set ids
    this.rules.forEach( (r,i) => r.id = i );

    // Process commands
    let idx = this.commands.findIndex( x => x.cmd === "prerun" );
    if ( idx !== -1 ) {
      // Process pre-run and other commands with it
      let c = this.commands[idx];
      let cmd = c.cmd;
      let p = c.params;
      if ( p.length < 1 ) throw new TypeError("Prerun: Invalid number of parameters.");
      let branch = c.opt.length ? parseInt(c.opt) : 0;
      if ( branch < 0 || branch > 16 ) throw new RangeError("Option '/': Branch must be between 0-16.");
      let rule = this.getRule(";");
      rule = rule.replace( /;prerun[^;]+/g, "" ); // filter out to avoid recursion
      let edges = this.rule( rule, parseInt(p[0]) || 10 );
      this.initial.push( { edges: edges, b: branch } );
    } else {
      // Process commands
      let negedges = []; // Edges to be removed from the final set
      this.commands.forEach( c => {
        let cmd = c.cmd;
        let p = c.params;
        let branch = c.opt.length ? parseInt(c.opt) : 0;
        if ( branch < 0 || branch > 16 ) throw new RangeError("Option '/': Branch must be between 0-16.");
        let edges = [];

        switch( cmd ) {
          case "": // initial graph
            let [pos,neg] = p[0].split("\\");
            if ( pos ) {
              edges = pos.split("(").map( p => [ ...p.replace( /[^-a-z0-9,\.]+/g, "" ).split(",") ] ).slice(1);
            }
            if ( neg ) {
              negedges.push( { edges: neg.split("(").map( p => p.replace( /[^-a-z0-9,\.]+/g, "" ) ).slice(1), b: branch } );
            }
            break;
          case "rule":
            if ( p.length < 2 ) throw new TypeError("Rule: Invalid number of parameters.");
            edges = this.rule( p[0].slice(1, -1) || "", parseInt(p[1]) || 10 );
            break;
          case "points":
            if ( p.length < 1 ) throw new TypeError("Points: Invalid number of parameters.");
            edges = this.points( parseInt(p[0]) || 1 );
            break;
          case "line":
            if ( p.length < 1 ) throw new TypeError("Line: Invalid number of parameters.");
            edges = this.grid( [ parseInt(p[0]) || 1 ] );
            break;
          case "grid": case "ngrid":
            if ( p.length < 1 ) throw new TypeError("Grid: Invalid number of parameters.");
            edges = this.grid( p.map( x => parseInt(x) ).filter(Boolean) );
            break;
          case "sphere":
            if ( p.length < 1 ) throw new TypeError("Sphere: Invalid number of parameters.");
            edges = this.complete( parseInt(p[0]) || 10, 1, true );
            break;
          case "random":
            if ( p.length < 3 ) throw new TypeError("Random: Invalid number of parameters.");
            edges = this.random( parseInt(p[0]) || 10, parseInt(p[1]) || 3, parseInt(p[2]) || 3 );
            break;
          case "complete":
            if ( p.length < 1 ) throw new TypeError("Complete: Invalid number of parameters.");
            edges = this.complete( parseInt(p[0]) || 10 );
            break;
          default:
            throw new TypeError( "Unknown command: " + c.cmd );
        }

        // If oneway option specified, sort edges
        if ( p.includes("oneway") ) {
          edges = edges.map( x => x.sort( (a,b) => a - b ) );
        }

        // If twoway option specified, make each edge a two-way edge
        if ( p.includes("twoway") ) {
          edges = edges.map( x => [x,x.slice().reverse()] ).flat();
        }

        // If inverse option specified, invert each edge
        if ( p.includes("inverse") ) {
          edges = edges.map( x => x.reverse() );
        }

        this.initial.push( { edges: edges, b: branch } );
      });

      // Remove negative edges
      negedges.forEach( x => {
        this.initial.forEach( y => {
          if ( x.b === 0 || y.b === 0 || (x.b & y.b) ) {
            y.edges = y.edges.filter( z => !x.edges.includes( z.join(",") ) );
          }
        })
      });

    }

    // Use first lhs as the initial state, if not specified
    // Note: replace all vertices with pattern 1, e.g. (1,2) => (1,1)
    if ( this.rules.length && this.initial.length === 0 ) {
      let edges = this.rules[0].lhs.map( e => e.map( x => 1 ));
      this.initial.push( { edges: edges, b: 0 } );
    }

    // Normalize initial states
    let u = [];
    this.initial.forEach( i => {
      let v = i.edges.flat().sort((a,b) => a-b ).map(String);
      u = [ ...new Set( [...u, ...v ] ) ]
      i.edges = i.edges.map( e => e.map(String) );
    });
    this.initial.forEach( i => {
      i.edges = i.edges.map( e => e.map( x => u.indexOf( x ) ) );
    })

    if ( this.initial.length === 0 ) {
      throw new TypeError("Parsing the rule failed.");
    }

  }

  /**
  * Return rule as a string.
  * @param {string} [sep="<br>"] Separator for rules
  * @return {string} Rule as a string.
  */
  getRule( sep = "<br>" ) {
    let s = "";
    let ef = (e) => { return s += "(" + e.map( v => v + 1 ).join(",") + ")"; };

    // Rules
    this.rules.forEach( r => {
      if ( s.length ) s += sep;
      r.lhs.forEach( ef );
      if ( r.hasOwnProperty("neg") && r.neg.length > 0 ) {
        s += "\\";
        r.neg.forEach( ef );
      }
      s += "->";
      if ( r.rhs.length === 0 ) {
        s += "()";
      } else {
        r.rhs.forEach( ef );
      }
      if ( r.opt && r.opt.length > 0 ) s += "/" + r.opt;
    });

    // Commands and initial graphs
    this.commands.forEach( c => {
      if ( s.length ) s += sep;
      s += (c.cmd === "") ? c.params : (c.cmd + "(" + c.params.join(",") + ")");
      if ( c.opt && c.opt.length > 0 ) s += "/" + c.opt;
    });

    return s;
  }

}

export { Rulial };
