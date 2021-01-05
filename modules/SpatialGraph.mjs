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
	* Delete/add hyperedges.
	* @param {Hyperedge[]} del Hyperedges to delete
	* @param {Hyperedge[]} add Hyperedges to add
	* @param {Object} [event={}] Optional event properties
	*/
	rewrite( del, add, event = {} ) {
		// Process all edges to delete
		for( let i=0; i < del.length; i++ ) {
			// Decrease/remove edge
			this.delete( del[i] );
			// Remove search patterns
			for( let j = del[i].length - 1; j >= 0; j-- ) {
				const pattern = del[i].map( (x,k) => ( k !== j ? "*" : x ) ).join(",");
				const p = this.P.get( pattern );
				let idx = p.findIndex( x => (x.length === del[i].length) && (x.every( (y,k) => y === del[i][k])) );
				p.splice( idx, 1 );
				if ( p.length === 0 ) this.P.delete( pattern );
			}
		}
		// Process all edges
		for( let i=0; i < add.length; i++ ) {
			// Add edge
			this.add( add[i], event );
			// Add search patterns
			for( let j = add[i].length - 1; j >= 0; j-- ) {
				const pattern = add[i].map( (x,k) => ( k === j ? x : "*" ) ).join(",");
				const p = this.P.get( pattern );
				typeof p !== 'undefined' ? p.push( add[i] ) : this.P.set( pattern, [ add[i] ] );
			}
		}
	}

	/**
	* Count # of possible instances of the given a list of hyperedges.
	* @param {Hyperedge[]} edge Array of hyperedges
	* @return {number} Number of possible instances.
	*/
	count( edges ) {
		// Go through all edges
		const cnts = {};
		for( let i = edges.length - 1; i >= 0; i-- ) {
			const key = edges[i].join(",");
			if ( !this.E.has( key ) ) return 0; // Some edge doesn't exist, return 0
			// Either we got the same edge again or we init the # occurances
			cnts.hasOwnProperty( key ) ? cnts[ key ]-- : cnts[ key ] = this.E.get( key ).cnt;
		}
		// Return minimum, 0 if negative
		return Math.max(0, Math.min.apply( null, Object.values( cnts ) ) );
	}

	/**
	* Find edges that match to the given pattern.
	* @param {Hyperedge} pattern Hyperedge search pattern, wild card -1
	* @return {Hyperedge[]} Matching hyperedges.
	*/
	find( pattern ) {
		// Pattern has no wild cards, so we look for an exact match
		if ( pattern.every( x => x !== -1 ) ) {
			return ( this.E.has( pattern.join(",") ) ? [ pattern ] : [] );
		}

		// All wild cards, so we return all edges of the given length
		if ( pattern.every( x => x === -1 ) ) {
			const found = [];
			for( const e of this.E.values() ) {
				if ( e.edge.length === pattern.length ) found.push( e.edge );
			}
			return found;
		}

		// Extract individual keys and test that they exist
		const keys = [];
		for( let i = pattern.length-1; i >=0; i-- )
		if ( pattern[i] !== -1 ) {
			let key = pattern.map( (x,j) => ( j === i ? x : "*" )).join(",");
			if ( !this.P.has( key) ) return [];
			keys.push( key );
		}

		// Find edges based on keys; if several, get the intersection
		let found = [ ...this.P.get( keys[0] ) ];
		for( let i = keys.length-1; i >= 1; i-- ) {
			found = this.P.get( keys[i] ).filter( x => found.some( y => y.every( (z,k) => z === x[k] ) ) );
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
		const radius = Math.round( tree.length / 2 );
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
