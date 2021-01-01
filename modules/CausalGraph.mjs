import { Hypergraph } from "./Hypergraph.mjs";

/**
 * @class CausalGraph representing causal graph.
 * @author Mika Suominen
 */
class CausalGraph extends Hypergraph {

	/**
	 * Creates an instance of CausalGraph.
	 * @constructor
	 */
	constructor() {
		super();
		this.L = new Map(); // Search for leafs of hypergraph vertices
	}

	/**
   * Clear the CausalGraph for reuse.
   */
	clear() {
		super.clear();
		this.L.clear();
	}

	/**
	 * Rewrite event.
	 * @param {numbers[]} match Array of vertices matching LHS
	 * @param {numbers[]} modified Array of vertices modified by
	 * @param {Object} [event={}] Event properties
	 */
	rewrite( match, modified, event = {} ) {
		// Add Hyperedges
		const v2 = ++this.maxv;
		this.V.set( v2, { in: [], out: [] });

		for( let i = match.length - 1; i >= 0; i-- ) {
			const l = this.L.get( match[i] );
			if ( typeof l === 'undefined' ) continue;
			const v1 = l[ l.length - 1 ];
			if ( v1 === v2 ) continue;
			const e = [ v1, v2 ];
			const key = e.join(",");
			if ( !this.E.has( key ) ) {
				this.add( e, { ...event, mod: modified.join(",") } );
			}
		}

		// Update leafs
		for( let i = modified.length - 1; i >= 0; i-- ) {
			if ( this.L.has( modified[i] ) ) {
				this.L.get( modified[i] ).push( v2 );
			} else {
				this.L.set( modified[i], [ v2 ] );
			}
		}
	}

	/**
	 * Worldline.
	 * @param {Vertex} v Root vertex of the worldline
	 * @return {Hyperedge[]} Wordline.
	 */
	worldline( v ) {
		const vs = this.L.get( v );
		if ( typeof vs === 'undefined' ) throw new Error("Vertex not found");
		const wl = [];
		for ( let i = 0; i < (vs.length - 1); i++ ) wl.push( [ vs[i], vs[i+1] ] );
		return wl;
	}

	/**
	 * Light cones.
	 * @param {Vertex} moment Single point in space and time
	 * @param {number} length Size of the cones
	 * @param {boolean} [past=true] Include past light cone
	 * @param {boolean} [future=true] Include future light cone
	 * @return {Hyperedge[]} Light cone.
	 */
	lightcone( moment, length, past = true, future = true ) {
		let pastcone = [], futurecone = [];
		if ( past ) pastcone =  this.nball( moment, length, true, false );
		if ( future ) futurecone =  this.nball( moment, length, true, true );
		return [ ...pastcone, ...futurecone ];
	}

	/**
	 * Timelike hypersurface/slice.
	 * @param {Vertex} moment1 Starting point in space and time
	 * @param {Vertex} moment2 Ending point in space and time
	 * @return {Vertex[]} Timelike hypersurface.
	 */
	time( moment1, moment2 ) {
		const vertices = [];
		this.events.forEach( e => {
			if ( e.hasOwnProperty("step") && e["step"] >= moment1 && e["step"] <= moment2 ) {
				vertices.push( e["a"][1] );
			}
		});
		return [ ...new Set( vertices ) ];
	}

	/**
	 * Approximate dimension and curvature of a n-dimensional cone.
	 * @param {Vertex} moment Single point in space and time
	 * @return {Object} Dimension and curvature.
	 */
	geom( moment ) {
		const tree = this.tree( moment, true ); // cone DAG
		const conelen = tree.length;
		const volume = tree.flat().length;
		const geodesic = this.geodesic( moment, tree[ conelen-1 ][0], true ).flat();
		const curvs = [];
		for( const g of geodesic ) curvs.push( this.orc( g[0], g[1], 1, true ) );
		const curv = Hypergraph.mean( curvs );
		const dim = Math.log( volume ) / Math.log( conelen );
		return { dim: dim, curv: curv };
	}

	/**
	 * Report status.
	 * @return {Object} Status of causal graph.
	 */
	status() {
		const stat = super.status();
		if ( this.V.size >= 200 ) {
			const geom = this.geom( 10 );
			stat["dim"] = geom.dim.toLocaleString(undefined, { maximumFractionDigits: 1, minimumFractionDigits: 1 });
			stat["curv"] = geom.curv.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 });
		}
		return stat;
	}

}

export { CausalGraph };
