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
		this.L = new Map(); // Map from spatial edge id to causal vertex
		this.K = new Map(); // Worldlines from undirected spatial vertex to causal vertices
		this.S = new Map(); // Map from step number to causal vertices
		this.maxstep = -1; // Record max step
	}

	/**
	* Clear the CausalGraph for reuse.
	*/
	clear() {
		super.clear();
		this.L.clear();
		this.K.clear();
		this.S.clear();
		this.maxstep = -1;
	}

	/**
	* Make pairs of an array, used to break worldline into pairs of two.
	* @static
	* @param {number[]} arr Array of numbers
	* @return {number[][]} Array of pairs of numbers.
	*/
	static pairs( arr ) {
		const r = [];
		for ( let i = 0; i < arr.length - 1; i++ ) r.push( [ arr[i], arr[i+1] ] );
		return r;
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
	* @param {number[]} hit Hyperedge ids to be deleted
	* @param {number[]} add Hyperedge ids to be added
	* @param {object} update Rule with actual edges { lhs, rhs }
	* @param {number} step Rewriting step number
	*/
	rewrite( hit, add, update, step) {

		// Add new vertex
		const v = ++this.maxv;
		const mods = [ ...new Set( [ ...update.lhs.flat(), ...update.rhs.flat() ] ) ];
 		const obj = { in: [], out: [], step: step, mods: mods, paths: 0 };
		this.V.set( v, obj );

		// Add to steps
		this.S.has( step ) ? this.S.get( step ).push( v ) : this.S.set( step, [ v ] );
		if ( this.maxstep < step ) this.maxstep = step;

		// Add causal edges, if missing
		for( let i = hit.length - 1; i >= 0; i-- ) {
			const l = this.L.get( hit[i] );
			if ( typeof l === 'undefined' ) continue; // Ignore first instance
			if ( l.v === v ) continue; // Ignore self-loops

			// Path counting
			obj.paths++;

			// Transitive reduction and path counting
			const edge = [ l.v, v ];
			if ( !this.F.has( edge.join(",") ) ) {
				this.add( edge, { level: step } );
			}
		}

		// Calculate energy and mass ratio
		// Hypothesis 1: energy is the total # of lhs and rhs edges
		// Hypothesis 2: mass ratio is the # of edges with only existing rhs vertices
		//    divided by the # of all rhs edges
		obj.energy = update.lhs.length + update.rhs.length;
		let oldvs = [ ...new Set( update.lhs.flat() ) ];
		let alledges = update.rhs.length;
		let oldedges = update.rhs.filter( e => e.every( v => oldvs.includes(v) ) ).length;
		obj.massratio = alledges ? oldedges / alledges : 0;
		let rhs = update.rhs.map( e => e.join(",") );
		let lhsinv = update.lhs.map( e => e.slice().reverse().join(",") );
		obj.spin = lhsinv.filter( x => rhs.includes( x ) ).length;

		// Update leafs
		add.forEach( (e,i) => this.L.set( e, { v: v, idx: i } ) );
		mods.forEach( u => this.K.has( u ) ? this.K.get( u ).push( v ) : this.K.set( u, [ v ] ) );

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
	* Small time cone of given radius.
	* @param {Vertex} v Single point in space and time
	* @param {number} r Radius in steps
	* @return {Vertex[]} All points within radius r.
	*/
	cone( v, r ) {
		if ( !this.V.has(v) ) throw new Error("Cone: Vertex not found.");
		const step = this.V.get( v ).step;
		return [ ...this.tree( v, true, false, [], r ).flat(),
			...this.tree( v, true, true, [], r ).flat() ]
			.filter( x => Math.abs( step - this.V.get( x ).step ) <= r );
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
