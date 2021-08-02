import { Hypergraph } from "./Hypergraph.mjs";

/**
* @class SpatialGraph representing hypergraph.
* @author Mika Suominen
*/
class SpatialGraph extends Hypergraph {

	/**
	* Creates an instance of SpatialGraph.
	* @constructor
	*/
	constructor() {
		super();
		this.P = new Map(); // Search patterns for edges
	}

	/**
	* Clear the SpatialGraph for reuse.
	*/
	clear() {
		super.clear();
		this.P.clear();
	}

	/**
	* Delete and add hyperedges.
	* @param {number[]} del Hyperedge ids to delete
	* @param {Hyperedge[]} add Hyperedges to add
	* @return {number[]} Arrays of hyperedge ids that were added
	*/
	rewrite( del, add ) {
		// Process all edges to delete
		for( const e of del ) {
			// Remove search patterns
			if ( this.E.has( e ) ) {
				let edge = this.E.get( e );
				for( let j = 0; j < edge.length; j++ ) {
					const pattern = edge.map( (x,k) => ( k !== j ? "*" : x ) ).join(",");
					let p = this.P.get( pattern );
					let idx = p.findIndex( x => (x.length === edge.length) && (x.every( (y,k) => y === edge[k])) );
					p.splice( idx, 1 );
					if ( p.length === 0 ) this.P.delete( pattern );
				}

				// Remove the edge
				this.delete( e );
			}
		}

		// Process all edges to add
		let es = [];
		for( const edge of add ) {
			// Add edge
			let e = this.add( edge );
			es.push( e );

			// Add search patterns
			for( let j = edge.length - 1; j >= 0; j-- ) {
				const pattern = edge.map( (x,k) => ( k === j ? x : "*" ) ).join(",");
				const p = this.P.get( pattern );
				typeof p !== 'undefined' ? p.push( edge ) : this.P.set( pattern, [ edge ] );
			}
		}

		return es;
	}

	/**
	* Generate all combinations of an array of arrays
	* @generator
	* @param {number[][]} arr Array of arrays
	* @return {number[][]} Arrays of all combinations
	*/
	*combinations( arr ) {
  	let [head, ...tail] = arr;
  	let remainder = tail.length ? this.combinations(tail) : [[]];
  	for (let r of remainder) for (let h of head) yield [h, ...r];
	}

	/**
	* Return all possible combinations of the given a list of hyperedges.
	* @param {Hyperedge[]} edge Array of hyperedges
	* @return {number[][]} Arrays of hyperedge ids
	*/
	hits( edges ) {
		const h = [];
		for( let i = 0; i < edges.length; i++ ) {
			let es = this.F.get( edges[i].join(",") );
			if ( typeof es === 'undefined' ) return []; // Some edge doesn't exist, return 0
			h.push( es );
		}

		// Return all combinations, but filter out those with duplicate edge ids
		let hits = [];
		for( let c of this.combinations(h) ) {
			if ( c.every( (x,i,arr) => arr.indexOf(x) === i ) ) {
				hits.push( c );
			}
		}

		return hits;
	}

	/**
	* Find edges that match to the given wild card search pattern.
	* @param {Hyperedge} pattern Hyperedge search pattern, wild card -1
	* @return {Hyperedge[]} Matching hyperedges.
	*/
	find( p ) {
		let found = [];

		if ( p.every( x => x !== -1 ) ) {
			// Pattern has no wild cards, so we look for an exact match
			if ( this.F.has( p.join(",") ) ) {
				found.push( p );
			}
		} else if ( p.every( x => x === -1 ) ) {
			// All wild cards, so we return all edges of the given length
			for( const f of this.F.values() ) {
				const edge = this.E.get( f[0] );
				if ( edge.length === p.length ) found.push( edge );
			}
		} else {
			// Extract individual keys and test that they exist
			const keys = [];
			for( let i = 0; i < p.length; i++ ) {
				if ( p[i] !== -1 ) {
					let key = p.map( (x,j) => ( j === i ? x : "*" )).join(",");
					if ( !this.P.has( key ) ) return [];
					keys.push( key );
				}
			}

			// Find edges based on keys
			// Filter out duplicates. If several keys, get the intersection.
			let f2 = [], f3;
			for( const edge of this.P.get( keys[0] ) ) {
				if ( !f2.includes( edge.join(",") ) ) {
					found.push( edge );
					f2.push( edge.join(",") );
				}
			};
			for( let i = 1; i < keys.length; i++ ) {
				found = [];
				f3 = [];
				for( const edge of this.P.get( keys[i] ) ) {
					if ( f2.includes( edge.join(",") ) ) {
						found.push( edge );
						f3.push( edge.join(",") );
					}
				}
				f2 = f3;
			}
		}

		return found;
	}

	/**
	* Space-like hypersurface/slice.
	* @param {Vertex} v1 Starting point in space
	* @param {Vertex} v2 Ending point in space
	* @return {Vertex[]} Sapcelike hypersurface.
	*/
	space( v1, v2 ) {
		const vertices = [];
		for( let i = v1; i <= v2; i++ ) {
			if ( this.V.has(i) ) vertices.push( i );
		}
		return vertices;
	}

	/**
	* Approximate dimension and curvature of a n-dimensional ball.
	* @param {Vertex} center Center of the n-ball
	* @return {Object} Dimension and curvature.
	*/
	geom( center ) {
		const tree = this.tree( center );
		const radius = Math.round( tree.length / 3 );
		const ball = tree.slice( 0, radius + 1 ).flat();
		const volume = ball.length;
		const geodesic = this.geodesic( center, tree[ radius ][0] ).flat();
		const curvs = [];
		for( const g of geodesic ) curvs.push( this.orc( g[0], g[1], 1, false ) );
		const curv = Hypergraph.mean( curvs );
		const dim = Math.log( volume ) / Math.log( radius );
		return { dim: dim, curv: curv };
	}

	/**
	* Report status.
	* @return {Object} Status of the spatial graph.
	*/
	status() {
		const stat = super.status();
		if ( this.V.size >= 200 ) {
			const geom = this.geom( this.V.keys().next().value );
			stat["dim"] = geom.dim.toLocaleString(undefined, { maximumFractionDigits: 1, minimumFractionDigits: 1 });
			stat["curv"] = geom.curv.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 });
		}
		return stat;
	}
}


export { SpatialGraph };
