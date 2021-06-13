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
		this.L = new Map(); // Map from spatial edge to causal vertex
		this.K = new Map(); // Worldlines from undirected spatial edge to causal vertex
		this.maxstep = 0; // Record max step
	}

	/**
	* Clear the CausalGraph for reuse.
	*/
	clear() {
		super.clear();
		this.L.clear();
		this.K.clear();
		this.maxstep = 0;
	}

	/**
	* Make pairs of an array, used to break worldline into pairs of two.
	* @static
	* @param {number[]} arr Array of numbers
	* @return {number[][]} Array of pairs of numbers.
	*/
	static pairs( arr ) {
		const result = [];
		for ( let i = 0; i < (arr.length - 1); i++ ) result.push( [ arr[i], arr[i+1] ] );
		return result;
	}

	/**
	* Return vertex label including modified vertices.
	* @param {Vertex} v Vertex
	* @return {string} Link label.
	*/
	vertexLabel( v ) {
		if ( !this.V.has( v ) ) return "";
		const u = this.V.get( v );
		return '[' + v +'] ' + u.mods.toString() + ' (step: ' + u.step + ')';
	}

	/**
	* Rewrite event.
	* @param {Hyperedge[]} hit Hyperedges hit
	* @param {Hyperedge[]} del Hyperedges to delete
	* @param {Hyperedge[]} add Hyperedges to add
	* @param {number} step Rewriting step number
	*/
	rewrite( hit, del, add, step ) {
		// Add new vertex
		const v2 = ++this.maxv;
		const modified = [ ...new Set( [ ...del.flat(), ...add.flat() ] ) ].sort();
		this.V.set( v2, { in: [], out: [], step: step, mods: modified });
		if ( this.maxstep < step ) this.maxstep = step;

		// Add causal edges, if missing
		for( let i = hit.length - 1; i >= 0; i-- ) {
			const v1 = this.L.get( hit[i].join(",") );
			if ( typeof v1 === 'undefined' ) continue; // Ignore first instance
			if ( v1 === v2 ) continue; // Ignore self-loops
			const e = [ v1, v2 ];
			const key = e.join(",");
			if ( !this.E.has( key ) ) {
				this.add( e, { level: step } );
			}
		}

		// Update leafs
		add.forEach( e => this.L.set( e.join(","), v2) );
		modified.forEach( v => {
			if ( this.K.has( v ) ) {
				this.K.get( v ).push( v2 );
			} else {
				this.K.set( v, [ v2 ] );
			}
		});

	}

	/**
	* Worldline of spatial vertex.
	* @param {Vertex[]} vs An array of vertices
	* @return {Hyperedge[]} Wordline.
	*/
	worldline( vs ) {
		const ns = [];
		vs.forEach( v => {
			if ( !this.K.has( v ) ) throw new Error("Worldline: Vertex not found.");
			ns.push( [ ...this.K.get( v ) ] );
		});
    const diff = ns.length ? ns.reduce((p,c) => p.filter(e => c.includes(e))) : [];
		const wl = [];
		CausalGraph.pairs( diff ).forEach( e => wl.push( e ) );
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
	* Timelike hypersurface/slice.
	* @param {Vertex} moment1 Starting point in space and time
	* @param {Vertex} moment2 Ending point in space and time
	* @return {Vertex[]} Timelike hypersurface.
	*/
	time( moment1, moment2 ) {
		const vertices = [];
		this.V.forEach( (v,i) => {
			if ( v.step >= moment1 && v.step <= moment2 ) vertices.push( i );
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
