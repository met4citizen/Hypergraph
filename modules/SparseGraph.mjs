import { SpatialGraph } from "./SpatialGraph.mjs";

/**
* @class Hypergraph representing a sparse graph.
* @author Mika Suominen
*/
class SparseGraph extends SpatialGraph {

	/**
	* @typedef {number} Vertex
	* @typedef {Vertex[]} Hyperedge
	*/

	/**
	* Creates an instance of Hypergraph.
	* @constructor
	*/
	constructor() {
    super();
	}

	/**
	* Add a match.
	* @param {Object} match
	*/
	addMatch( edge, e = null ) {
    // Check if this edge is already covered
    if ( e && this.E.has(e) ) return;
    if ( !e && this.F.has(e) && this.F.get(e).length > 4 ) return;
    let s = edge.map( v => v === -1 ? "*" : v).join(",");
    if ( !e && this.P.has(s) && this.P.get(s).length > 4 ) return;

    e = e || --this.maxe;
    edge = edge.map( v => v === -1 ? --this.maxe : v );

		// Add new edge
		this.E.set( e, edge );

		// Add search pattern F
		const p = edge.join(",");
		const f = this.F.get( p );
		typeof f !== 'undefined' ? f.push( e ) : this.F.set( p, [ e ] );

    // Add search patterns P
    for( let j = edge.length - 1; j >= 0; j-- ) {
      const pattern = edge.map( (x,k) => ( k === j ? x : "*" ) ).join(",");
      const p = this.P.get( pattern );
      typeof p !== 'undefined' ? p.push( edge ) : this.P.set( pattern, [ edge ] );
    }
	}

	/**
	*  Delete edge.
	* @param {number} e Hyperedge id to be deleted
	*/
	deleteMatch( e ) {

    let edge = this.E.get( e );
    if ( typeof edge !== 'undefined' ) {
      // Remove search pattern F
      const p = edge.join(",");
      const f = this.F.get( p );
      const idx = f.findIndex( x => x === e );
      f.splice( idx, 1 );
      if ( f.length === 0 ) this.F.delete( p );

      // Remove search patterns P
      for( let j = 0; j < edge.length; j++ ) {
        const pattern = edge.map( (x,k) => ( k !== j ? "*" : x ) ).join(",");
        let p = this.P.get( pattern );
        let idx = p.findIndex( x => (x.length === edge.length) && (x.every( (y,k) => y === edge[k])) );
        p.splice( idx, 1 );
        if ( p.length === 0 ) this.P.delete( pattern );
      }

  		// Delete edge
  		this.E.delete( e );
    }
  }

}

export { SparseGraph };
