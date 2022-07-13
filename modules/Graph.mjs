
/**
* @class Graph
* @author Mika Suominen
*/
class Graph {

	/**
	* @typedef {number[]} Edge
	* @typedef {number[]} Pattern
	* @typedef {Object} Node
	* @typedef {Object} Token
	*/

	/**
	* Creates an instance of Hypergraph.
	* @constructor
	*/
	constructor() {
    this.nodes = [];
    this.links = [];
		this.L = new Map(); // Leafs
		this.P = new Map(); // Search patterns for leafs
		this.V = new Map(); // Map vertex id to node object
		this.T = new Map(); // Map token to array of links
	}

	/**
	* Clear the hypergraph for reuse.
	*/
	clear() {
    this.nodes.length = 0;
    this.links.length = 0;
		this.L.clear();
		this.P.clear();
		this.V.clear();
		this.T.clear();
	}


	/**
	* Calculate the mean of array elements.
	* @static
	* @param {number[]} arr Array of numbers
	* @return {number} The mean.
	*/
	static mean( arr ) {
		return arr.reduce( (a,b) => a + b, 0 ) / arr.length;
	}

	/**
	* Calculate the median of array numbers.
	* @static
	* @param {number[]} arr Array of numbers
	* @return {number} The median.
	*/
	static median( arr ) {
		const mid = Math.floor( arr.length / 2 );
		const nums = [ ...arr ].sort( (a, b) => a - b );
		return arr.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
	}


	/**
	* Add a multiway hyperedge.
	* @param {Token} t Token.
	* @param {number} [view=1] 1=space, 2=time, 3=phase
	* @return {Node[]} Array of nodes.
	*/
	add( t, view = 1 ) {
		// Add the edge
		if ( this.T.has(t) ) return []; // Already added

		// Add search patterns
		const edge = t.edge;
		let k = edge.join(",");
		let es = this.L.get( k );
		if ( es ) {
			if ( view === 2 ) return []; // Edge already exists, return (transitive closure)
			if ( view === 3 ) {
			 if ( edge.length === 1 ) {
				 this.V.get( edge[0] ).refs++; // Increase node size
			 }
			 return []; // Edge already exists, return (transitive closure)
			}
		}
		es ? es.push( t ) : this.L.set( k, [ t ] );
		for( let i = edge.length-1; i>=0; i-- ) {
			k = edge.map( (x,j) => ( j === i ? x : "*" ) ).join(",");
			es = this.P.get( k );
			es ? es.push( t ) : this.P.set( k, [ t ] );
		}

		// New edge object
		const o = [];
		this.T.set( t, o );

		// Calculate position
		let p = { x: 0, y: 0, z: 0 }, cnt = 0;
		let u = [ ...new Set( t.edge ) ];
		u.forEach( id => {
			let v = this.V.get( id );
			if ( v && v.x ) {
				p.x += v.x;
				p.y += v.y;
				p.z += v.z;
				cnt++;
			}
		});
		if ( cnt ) {
			p.x /= cnt;
			p.y /= cnt;
			p.z /= cnt;
		}

		// Add vertices and links
		const vs = [];
    let vprev
		for( let i = 0; i < edge.length; i++ ) {
      let id = edge[i];
			let v = this.V.get( id );
			if ( v ) {
				v.refs++;
				v.t.push( t );
				if ( view === 1 ) v.bc = t.bc; // In space view, update vertex bc to latest
			} else {
        // New vertex
        v = {
					id: id,
					refs: 1,
					in: [], out: [],
					source: [], target: [],
					style: 0,
					x: (p.x + (view === 2 ? (Math.sign(p.x)*Math.random()) : ((Math.random()-0.5)/100))),
					y: (p.y + (view === 2 ? (Math.sign(p.y)*Math.random()) : ((Math.random()-0.5)/100))),
					z: (p.z + (view === 2 ? (10*Math.sign(p.z)*Math.random()) : ((Math.random()-0.5)/100))),
					bc: (view === 1 ? t.bc : t.mw[i].bc),
					mw: (view === 1 ? null : t.mw[i]),
					t: [t]
				};
				this.V.set( id, v );
        this.nodes.push( v );
			}

			vs.push( v );

      // Modify adjacency arrays
      if ( i < (edge.length-1) ) v.out.push( edge[i+1] );
			if ( i > 0 ) {
        v.in.push( edge[i-1] );

        // Curvature
				let curv = 0.5;
				let ls = vprev.source.filter( l => v.target.includes(l) && !l.hasOwnProperty("meshes") );
				if ( ls.length === 0 ) {
					// first link, keep straight
					if ( vprev !== v ) {
						curv = 0;
					}
				} else {
					let rot = 2 * Math.PI / ( ls.length + 1);
					ls.forEach( (l,j) => {
						l.curvature = 0.5;
						l.rotation = ( j + 1 ) * rot;
					});
				}

				// New link
        const l = {
					source: vprev,
					target: v,
					style: 0,
          curvature: curv,
					rotation: 0,
					bc: ( view === 1 ? t.bc : t.mw[ t.mw.length -1 ].bc ),
					w: ( t.hasOwnProperty("w") ? t.w : 1 ) // weight
        };
				vprev.source.push( l );
				v.target.push( l );
        this.links.push( l );
				o.push( l );
      }
      vprev = v;
		}

		// Hyperedges (in space mode only)
		if ( view === 1 && (vs.length === 1 || vs.length > 2) ) {
			const hl = {
				source: vs[ vs.length - 1 ],
				target: vs[0],
				hyperedge: vs,
				style: 4
			};
			if ( vs.length === 1 ) {
				hl.scale = 0;
				vs[ vs.length - 1 ].source.push( hl );
				vs[0].target.push( hl );
			}
			this.links.push( hl );
			o.push( hl );

			// Rescale rings
			if ( vs.length === 1 ) {
				let ls = vs[0].target.filter( l => l.hasOwnProperty("hyperedge") && l.hyperedge.length === 1 );
				ls.forEach( (l,i) => l.scale = i );
			}
		}

		return vs;
	}

	/**
	*  Delete multiway edge.
	* @param {Token} t Token.
	*/
	del( t ) {
		if ( !this.T.has( t ) ) return; // Already deleted

		// Delete links
		this.T.get( t ).forEach( l => {
			let idx = l.source.source.indexOf( l );
			if ( idx !== -1 ) l.source.source.splice( idx, 1 );
			idx = l.target.target.indexOf( l );
			if ( idx !== -1 ) l.target.target.splice( idx, 1 );

			if ( l.hyperedge && l.hyperedge.length === 1 ) {
				// Rescale rings
				let ls = l.target.target.filter( k => k.hasOwnProperty("hyperedge") && k.hyperedge.length === 1 );
				ls.forEach( (l,i) => l.scale = i );
			} else {
				// Restore curvature
				let ls = l.source.source.filter( x => l.target.target.includes(x) && !x.hasOwnProperty("meshes") );
				if ( ls.length === 1 ) {
					if ( l.source !== l.target ) {
						ls[0].curvature = 0;
					}
					ls[0].rotation = 0;
				} else if ( ls.length > 1 ) {
					let rot = 2 * Math.PI / ls.length;
					ls.forEach( (l,j) => {
						l.curvature = 0.5;
						l.rotation = j * rot;
					});
				}
			}
			this.links.splice( this.links.indexOf( l ), 1 );
		});

		// Remove search patterns
		const edge = t.edge;
		let k = edge.join(",");
		let es = this.L.get( k );
		es.splice( es.indexOf( t ), 1 );
		if ( es.length === 0 ) this.L.delete( k );
		for( let i = edge.length-1; i>=0; i-- ) {
			k = edge.map( (x,j) => ( j === i ? x : "*" ) ).join(",");
			es = this.P.get( k );
			es.splice( es.indexOf( t ), 1 );
			if ( es.length === 0 ) this.P.delete( k );
		}

		// Delete vertices
		for( let i = edge.length - 1; i >= 0; i-- ) {
      const id = edge[i];
			const v = this.V.get( id );
			if ( !v ) continue; // Already deleted, ignore
			if ( i > 0 ) v.in.splice( v.in.indexOf( edge[i-1] ), 1 );
			if ( i < (edge.length-1) ) v.out.splice( v.out.indexOf( edge[i+1] ), 1 );
			v.t.splice( v.t.indexOf( t ), 1 )
			v.refs--;
			if ( v.refs <= 0 ) {
        this.V.delete( edge[i] );
        this.nodes.splice( this.nodes.findIndex( v => v.id === id ), 1 );
      }
		}

		// Remove token
		this.T.delete( t );

	}

	/**
	* Generate all combinations of an array of arrays.
	* @generator
	* @param {Object[][]} arr Array of arrays
	* @return {Object[]} Combination
	*/
	*cartesian( arr ) {
		const inc = (t,p) => {
			if (p < 0) return true; // reached end of first array
			t[p].idx = (t[p].idx + 1) % t[p].len;
			return t[p].idx ? false : inc(t,p-1);
		}
		const t = arr.map( (x,i) => { return { idx: 0, len: x.length }; } );
		const len = arr.length - 1;
		do { yield t.map( (x,i) => arr[i][x.idx] ); } while( !inc(t,len) );
	}

	/**
	* Return all possible combinations of the given a list of hyperedges.
	* @param {Edge[]} edges Array of edges
	* @param {number} mode 0=no qm, 1=only qm, 2=both
	* @return {Token[][]} Arrays of tokens
	*/
	hits( edges, mode = 0 ) {
		const h = [];
		for( let i = 0; i<edges.length; i++ ) {
			let es = this.L.get( edges[i].join(",") );
			if ( !es ) return []; // Some edge doesn't exist
			h.push( es );
		}

		// All possible combinations
		let hits = [];
		for( let c of this.cartesian(h) ) {
			// Filter out combinations with duplicate edge ids
			if ( c.some( (x,i,arr) => arr.indexOf(x) !== i ) ) continue;
			hits.push( c );
		}

		return hits;
	}

	/**
	* Find edges that match to the given wild card search pattern.
	* @param {Pattern} p Search pattern, wild card < 0
	* @return {Edge[]} Matching hyperedges.
	*/
	find( p ) {
		let found = [];
		let wilds = p.reduce( (a,b) => a + ( b<0 ? 1 : 0 ), 0 );
		if ( wilds === 0 ) {
			// Pattern has no wild cards, so we look for an exact match
			if ( this.L.has( p.join(",") ) ) found.push( p );
		} else if ( wilds === p.length ) {
			// All wild cards, so we return all edges of the given length
			for( const ts of this.L.values() ) {
				if ( ts[0].edge.length === p.length ) found.push( [...ts[0].edge] );
			}
		} else {
			// Extract individual keys and find edges based on them
			// Filter out duplicates and get the intersection
			let f,k,ts;
			for( let i = p.length-1; i >= 0; i-- ) {
				if ( p[i] < 0 ) continue;
				k = p.map( (x,j) => ( j === i ? x : "*" )).join(",");
				ts = this.P.get( k );
				if ( !ts ) return [];
				f = f ? ts.filter( t => f.includes(t) ) : ts;
			}
			// Get unique edges
			if ( f ) {
				found = Object.values( f.reduce((a,b) => {
					a[b.edge.join(",")] = [...b.edge];
					return a;
				},{}));
			}
		}

		return found;
	}


	/**
	* BFS generator function.
	* @generator
	* @param {Node} v Root vertex of the bfs
	* @param {boolean} [dir=false] Use directed edges
	* @param {boolean} [rev=false] Reverse the order of directed edges
	* @yields {Node[]} The next leafs.
	*/
	*bfs( v, dir = false, rev = false ) {
		if ( !this.V.has( v ) ) return; // Node not found
		let searching = [ v ], visited = [];
		while( searching.length > 0 ) {
			// Yield the process; client can filter the search set
			let override = yield searching;
			if ( override ) searching = override;
			const leafs = [];
			for( const x of searching) {
				const w = this.V.get( x );
				if ( !dir || rev ) leafs.push( ...w.in );
				if ( !dir || !rev ) leafs.push( ...w.out );
			}
			visited = [ ...new Set( [ ...visited, ...searching ] ) ]; // Set Union
			searching = [ ...new Set( leafs ) ].filter( x => !visited.includes(x) ); // Set Difference
		}
	}

	/**
	* Random walk never visiting any vertex twice.
	* @param {Node} v Root vertex of the walk
	* @param {number} [distance=Infinity] Maximum distance
	* @param {boolean} [dir=false] Use directed edges
	* @param {boolean} [rev=false] Reverse the order of directed edges
	* @return {Hyperedge[]} True if array has duplicates.
	*/
	random( v, distance = Infinity, dir = false, rev = false ) {
		const path = [], gen = this.bfs( v, dir, rev );
		let d = 0, a = gen.next().value;
		while( ++d <= distance ) {
			const m = gen.next( a );
			if ( m.done ) break;
			const b = m.value[ Math.floor( Math.random() * m.value.length ) ];
			if ( dir || this.V.get( a[0] ).out.includes( b) ) {
				path.push( [ a[0], b ] );
			} else {
				path.push( [ b, a[0] ] );
			}

			a = [ b ];
		}
		return path;
	}

	/**
	* Tree.
	* @param {Node} root Root of the tree
	* @param {boolean} [dir=false] Use directed edges
	* @param {boolean} [rev=false] Reverse the order of directed edges
	* @param {Node[]} breaks Array of vertices on which to stop
	* @param {distance} distance Maximum length of the tree
	* @return {Node[][]} Array of vertex layers of the tree
	*/
	tree( root, dir = false, rev = false, breaks = [], distance = Infinity ) {
		const tree = [];
		let d = 0;
		for( const v of this.bfs( root, dir, rev ) ) {
			tree.push(v);
			if ( ++d > distance || breaks.some( x => v.includes(x) ) ) break;
		}
		return tree;
	}

	/**
	* Shortest path from vertex 'a' to vertex 'b' using BFS.
	* @param {Node} v1 First vertex
	* @param {Node} v2 Second vertex
	* @param {boolean} [dir=false] Use directed edges
	* @param {boolean} [rev=false] Reverse the order of directed edges
	* @param {boolean} [all=false] Return all shortest paths
	* @return {Edge[]} Shortest path(s) as an array of hyperedges
	*/
	geodesic( v1, v2, dir = false, rev = false, all = false ) {
		const genA = this.bfs( v1, dir, rev ), treeA = [];
		const genB = this.bfs( v2, dir, !rev ), treeB = [];
		let m, n = { value: [] };

		// Find the collision point
		while( true ) {
			m = genA.next();
			if ( m.done ) return []; // root/leaf not connected
			if ( m.value.some( x => n.value.includes( x ) ) ) break;
			treeA.push( m.value );
			n = genB.next();
			if ( n.done ) return []; // root/leaf not connected
			if ( n.value.some( x => m.value.includes( x ) ) ) break;
			treeB.push( n.value );
		}

		// Set the mid-point
		const path = new Array( treeA.length + treeB.length ).fill().map( () => new Array() );
		path[ treeB.length ] = m.value.filter( x => n.value.includes(x) );
		if ( !all ) path[ treeB.length ] = [ path[ treeB.length ][0] ]; // 1st path only
		const edges = new Array( path.length - 1 ).fill().map( () => new Array() );

		// Fill-in the 'path' and 'edges' from the mid-point using intersections
		for( let i = treeB.length - 1; i >= 0; i-- ) {
			n = genB.next( path[ i+1 ] );
			path[ i ] = treeA[i].filter( x => n.value.includes(x) );

			for( let j = path[i+1].length - 1; j >= 0; j-- ) {
				const v = this.V.get( path[i+1][j] );
				for( let k = path[i].length - 1; k >= 0; k-- ) {
					if ( ( !dir || !rev ) && v.in.includes( path[i][k] ) ) {
						edges[ i ].push( [ path[i][k], path[i+1][j] ] );
						if ( !all ) { path[ i ] = [ path[i][k] ]; break; }
					}
					if ( ( !dir || rev ) && v.out.includes( path[i][k] ) ) {
						edges[ i ].push( [ path[i+1][j], path[i][k] ] );
						if ( !all ) { path[ i ] = [ path[i][k] ]; break; }
					}
				}
			}
		}
		for( let i = treeB.length + 1; i < path.length; i++ ) {
			m = genA.next( path[ i-1 ] );
			path[ i ] = treeB[ path.length - 1 - i ].filter( x => m.value.includes(x) );

			for( let j = path[i-1].length - 1; j >= 0; j-- ) {
				const v = this.V.get( path[i-1][j] );
				for( let k = path[i].length - 1; k >= 0; k-- ) {
					if ( ( !dir || !rev ) && v.out.includes( path[i][k] ) ) {
						edges[ i-1 ].push( [ path[i-1][j], path[i][k] ] );
						if ( !all ) { path[ i ] = [ path[i][k] ]; break; }
					}
					if ( ( !dir || rev ) && v.in.includes( path[i][k] ) ) {
						edges[ i-1 ].push( [ path[i][k], path[i-1][j] ] );
						if ( !all ) { path[ i ] = [ path[i][k] ]; break; }
					}
				}
			}
		}
		return edges;
	}

	/**
	* N-dimensional ball.
	* @param {Node} center Center vertex of the n-ball
	* @param {Node} radius Radius of the n-ball
	* @param {boolean} [dir=false] Use directed edges
	* @param {boolean} [rev=false] Reverse the order of directed edges
	* @return {Edge[]} Array of edges inside the n-ball
	*/
	nball( center, radius, dir = false, rev = false ) {
		// Start from the root and get the distance tree up to the distance 'radius'
		const vs = this.tree( center, dir, rev, [], Math.abs(radius) ).flat();
		const edges = [];
		for( let i = vs.length - 1; i >= 0; i-- ) {
			const v = this.V.get( vs[i] );
			for( let j = vs.length - 1; j >= 0; j-- ) {
				if ( ( !dir || !rev ) && v.in.includes( vs[j] ) ) edges.push( [ vs[j], vs[i] ] );
				if ( ( !dir || rev ) && v.out.includes( vs[j] ) ) edges.push( [ vs[i], vs[j] ] );
			}
		}
		return edges;
	}

	/**
	* N-sphere.
	* @param {Node} center Center vertex of the n-sphere
	* @param {Node} radius Radius of the n-sphere
	* @param {boolean} [dir=false] Use directed edges
	* @param {boolean} [rev=false] Reverse the order of directed edges
	* @return {Node[]} Array of vertexes on the n-sphere
	*/
	nsphere( center, radius, dir = false, rev = false ) {
		// Start from the root and get the distance tree up to the distance 'radius'
		const tree = this.tree( center, dir, rev, [], Math.abs(radius) );
		const d = tree.length - 1;
		if ( d < Math.abs(radius) ) return []; // N-sphere with the given radius not found
		return tree[ d ];
	}

	/**
	* Minimum distance between two vertices.
	* @param {Node} v1 First vertex
	* @param {Node} v2 Second vertex
	* @param {boolean} [dir=false] Use directed edges
	* @param {boolean} [rev=false] Reverse the order of directed edges
	* @return {number} Number of step from 'a' to 'b', -1 if not connected
	*/
	dist( v1, v2, dir = false, rev = false ) {
		const genA = this.bfs( v1, dir, rev );
		const genB = this.bfs( v2, dir, !rev );
		let m, n = { value: [] }, d = -1;
		// Bidirectional BFS
		while( true ) {
			m = genA.next();
			if ( m.done ) return -1; // Not connected
			if ( m.value.some( x => n.value.includes( x ) ) ) return d;
			d++;
			n = genB.next();
			if ( n.done ) return -1; // Not connected
			if ( n.value.some( x => m.value.includes( x ) ) ) return d;
			d++;
		}
	}

	/**
	* Hypersurface.
	* @param {Node} v1 Starting point in space/time
	* @param {Node} v2 Ending point in space/time
	* @return {Node[]} Hypersurface
	*/
	surface( v1, v2 ) {
		const vertices = [];
		for( let i = v1; i <= v2; i++ ) {
			if ( this.V.has(i) ) vertices.push( i );
		}
		return vertices;
	}

	/**
	* Light cones.
	* @param {Node} moment Single point in space and time
	* @param {number} length Size of the cones
	* @param {boolean} [past=true] Include past light cone
	* @param {boolean} [future=true] Include future light cone
	* @return {Edge[]} Light cone.
	*/
	lightcone( moment, length, past = true, future = true ) {
		let pastcone = [], futurecone = [];
		if ( past ) {
			let s =  this.nsphere( moment, length, true, true );
			s.forEach( v => {
				pastcone.push( ...this.geodesic( v, moment, true, false, true ).flat() );
			});
		}
		if ( future ) {
			let s =  this.nsphere( moment, length, true, false );
			s.forEach( v => {
				futurecone.push( ...this.geodesic( v, moment, true, true, true ).flat() );
			});
		}
		return { past: [ ...new Set( pastcone ) ], future: [ ...new Set( futurecone ) ] };
	}


	/**
	* Computes the optimal transport matrix and returns sinkhorn distance
	* (i.e. optimal transport) using the Sinkhorn-Knopp algorithm
	* @param {numbers[][]} dm Cost/distance matrix
	* @param {numbers[]} [a=null] Marginal A, unif distibution by default
	* @param {numbers[]} [b=null] Marginal B, unif distibution by default
	* @param {number} [lam=10] Strength of the entropic regularization
	* @param {number} [epsilon=1e-8] Convergence parameter
	* @return {Object} Optimal transport matrix and sinkhorn distance.
	*/
	sinkhorn = function( dm, a = null, b = null, lam = 10, epsilon = 1e-8 ) {
		const m = dm.length;
		const n = dm[0].length;
		if ( !a ) a = new Array( m ).fill( 1/m );
		if ( !b ) b = new Array( n ).fill( 1/n );
		if ( a.length !== m || b.length !== n ) throw new Error("Dimensions don't match.");
		const P = new Array( m ).fill().map( x => new Array( n ).fill( 0 ) );
		let Psum = 0;
		for( let i = m-1; i >= 0; i-- )
			for( let j = n-1; j >= 0; j-- ) {
				P[i][j] = Math.exp( -lam * dm[i][j] );
				Psum += P[i][j];
			}
		let u = new Array( n ).fill(0); // row sums
		for( let i = m-1; i >= 0; i-- )
			for( let j = n-1; j >= 0; j-- ) {
				P[i][j] /= Psum;
				u[j] += P[i][j];
			}
		let du = new Array( n ); // row sums diff between iterations
		let v = new Array( m ); // column sums

		// Normalize matrix by scaling rows/columns until no significant change
		do {
			du.fill(0);
			v.fill(0);
			for( let i = m-1; i >= 0; i-- )
				for( let j = n-1; j >= 0; j-- ) {
					du[j] += P[i][j];
					P[i][j] *= b[j] / u[j]; // scale the rows
					v[i] += P[i][j]
				}
			u.fill(0);
			for( let i = m-1; i >= 0; i-- )
				for( let j = n-1; j >= 0; j-- ) {
					P[i][j] *= a[i] / v[i]; // scale the columns
					u[j] += P[i][j];
					du[j] -= P[i][j];
				}
		}
		while ( Math.max.apply( null, du.map( Math.abs ) ) > epsilon );

		// Calculate sinkhorn distance
		let dist = 0;
		for( let i = m-1; i >= 0; i-- )
			for( let j = n-1; j >= 0; j-- )
				dist += P[i][j] * dm[i][j];
		return { ot: P, dist: dist };
	}

	/**
	* Curvature based on Ollivier-Ricci (1-Wasserstein) distance.
	* @param {Node} v1 First vertex
	* @param {Node} v2 Second vertex
	* @param {number} [radius=1] Radius
	* @param {boolean} [dir=false] Use directed edges
	* @return {number} Ollivier-Ricci distance.
	*/
	orc( v1, v2, radius = 1, dir = false ) {
		let ns1, ns2;
		try {
			ns1 = this.nsphere( v1, Math.abs(radius), dir, true );
			ns2 = this.nsphere( v2, Math.abs(radius), dir, false );
			if ( ns1.length === 0 || ns2.length === 0 ) return 0;
		}
		catch( e ) {
			return 0;
		}

		// Construct distance matrix
		const dm = new Array( ns1.length ).fill().map( x => new Array( ns2.length ) );
		for( let i = ns1.length - 1; i >= 0; i-- )
			for( let j = ns2.length - 1; j >= 0; j-- )
				dm[i][j] = this.dist( ns1[i], ns2[j], dir );

		// Calculate Wasserstein-1 distance using sinkhorn-knopp algorithm
		return ( 1 - this.sinkhorn( dm )[ "dist" ] / this.dist( v1, v2, dir ) );
	}

	/**
	* Status.
	* @return {Object} Status of the hypergraph.
	*/
	status() {
		return { nodes: this.nodes.length, edges: this.links.length };
	}

}

export { Graph };
