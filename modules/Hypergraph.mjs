
/**
* @class Hypergraph representing a hypergraph.
* @author Mika Suominen
*/
class Hypergraph {

	/**
	* @typedef {number} Vertex
	* @typedef {Vertex[]} Hyperedge
	*/

	/**
	* Creates an instance of Hypergraph.
	* @constructor
	*/
	constructor() {
		this.V = new Map(); // Vertices
		this.E = new Map(); // Hyperedge ids
		this.maxv = -1; // Current maximum vertex number
		this.maxe = -1; // Current maximum edge number
		this.events = []; // Event log of additions and deletions used for animation
		this.F = new Map(); // Search patterns for edges
	}

	/**
	* Clear the hypergraph for reuse.
	*/
	clear() {
		this.V.clear();
		this.E.clear();
		this.maxv = -1;
		this.maxe = -1;
		this.events.length = 0;
		this.F.clear();
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
	* Add a new edge.
	* @param {Hyperedge} edge Hyperedge to be added
	* @return {number} Id of the added edge
	*/
	add( edge, props = {} ) {
		// Add new edge
		const e = ++this.maxe;
		this.E.set( e, edge );

		// Add search pattern
		const p = edge.join(",");
		const f = this.F.get( p );
		typeof f !== 'undefined' ? f.push( e ) : this.F.set( p, [ e ] );

		// Add vertices to adjacency arrays
		for( let i = edge.length - 1; i >= 0; i-- ) {
			let v = this.V.get( edge[i] );
			if ( typeof v === 'undefined' ) {
				v = { in: [], out: [] };
				this.V.set( edge[i], v );
				if ( edge[i] > this.maxv ) this.maxv = edge[i]; // Keep track of max #
			}
			if ( i > 0 ) v.in.push( edge[i-1] );
			if ( i < (edge.length-1) ) v.out.push( edge[i+1] );
		}

		// Add event
		this.events.push( { a: edge, ...props } );

		return e;
	}

	/**
	*  Delete edge.
	* @param {number} e Hyperedge id to be deleted
	*/
	delete( e, props = {} ) {
		// Delete vertices
		let edge = this.E.get( e );
		for( let i = edge.length - 1; i >= 0; i-- ) {
			const v = this.V.get( edge[i] );
			if ( i > 0 ) v.in.splice( v.in.indexOf( edge[i-1] ), 1 );
			if ( i < (edge.length-1) ) v.out.splice( v.out.indexOf( edge[i+1] ), 1 );
			if ( v.in.length === 0 && v.out.length === 0) this.V.delete( edge[i] );
		}

		// Remove search pattern
		const p = edge.join(",");
		const f = this.F.get( p );
		const idx = f.findIndex( x => x === e );
		f.splice( idx, 1 );
		if ( f.length === 0 ) this.F.delete( p );

		// Delete edge
		this.E.delete( e );

		// Add event
		this.events.push( { x: edge, ...props } );
	}

	/**
	* BFS generator function.
	* @generator
	* @param {Vertex} v Root vertex of the bfs
	* @param {boolean} [dir=false] Use directed edges
	* @param {boolean} [rev=false] Reverse the order of directed edges
	* @yields {Vertex[]} The next leafs.
	*/
	*bfs( v, dir = false, rev = false ) {
		if ( !this.V.has( v ) ) throw new Error("Given vertex not found.");
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
	* @param {Vertex} v Root vertex of the walk
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
	* @param {Vertex} root Root of the tree
	* @param {boolean} [dir=false] Use directed edges
	* @param {boolean} [rev=false] Reverse the order of directed edges
	* @param {Vertex[]} breaks Array of vertices on which to stop
	* @param {distance} distance Maximum length of the tree
	* @return {Vertex[][]} Array of vertex layers of the tree
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
	* @param {Vertex} v1 First vertex
	* @param {Vertex} v2 Second vertex
	* @param {boolean} [dir=false] Use directed edges
	* @param {boolean} [rev=false] Reverse the order of directed edges
	* @param {boolean} [all=false] Return all shortest paths
	* @return {Hyperedge[]} Shortest path(s) as an array of hyperedges
	*/
	geodesic( v1, v2, dir = false, rev = false, all = false ) {
		const genA = this.bfs( v1, dir, rev ), treeA = [];
		const genB = this.bfs( v2, dir, !rev ), treeB = [];
		let m, n = { value: [] };

		// Find the collision point
		while( true ) {
			m = genA.next();
			if ( m.done ) throw new Error("Root and Leaf are not connected.");
			if ( m.value.some( x => n.value.includes( x ) ) ) break;
			treeA.push( m.value );
			n = genB.next();
			if ( n.done ) throw new Error("Root and Leaf are not connected.");
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
	* @param {Vertex} center Center vertex of the n-ball
	* @param {Vertex} radius Radius of the n-ball
	* @param {boolean} [dir=false] Use directed edges
	* @param {boolean} [rev=false] Reverse the order of directed edges
	* @return {Hyperedge[]} Array of edges inside the n-ball
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
	* @param {Vertex} center Center vertex of the n-sphere
	* @param {Vertex} radius Radius of the n-sphere
	* @param {boolean} [dir=false] Use directed edges
	* @param {boolean} [rev=false] Reverse the order of directed edges
	* @return {Vertex[]} Array of vertexes on the n-sphere
	*/
	nsphere( center, radius, dir = false, rev = false ) {
		// Start from the root and get the distance tree up to the distance 'radius'
		const tree = this.tree( center, dir, rev, [], Math.abs(radius) );
		const d = tree.length - 1;
		if ( d < radius ) throw new Error("N-sphere with the given radius not found.");
		return tree[ d ];
	}

	/**
	* Minimum distance between two vertices.
	* @param {Vertex} v1 First vertex
	* @param {Vertex} v2 Second vertex
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
	* @param {Vertex} v1 First vertex
	* @param {Vertex} v2 Second vertex
	* @param {number} [radius=1] Radius
	* @param {boolean} [dir=false] Use directed edges
	* @return {number} Ollivier-Ricci distance.
	*/
	orc( v1, v2, radius = 1, dir = false ) {
		let ns1, ns2;
		try {
			ns1 = this.nsphere( v1, Math.abs(radius), dir, true );
			ns2 = this.nsphere( v2, Math.abs(radius), dir, false );
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
		return { nodes: this.V.size, edges: this.E.size };
	}

}

export { Hypergraph };
