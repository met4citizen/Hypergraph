import { TokenEvent } from "./TokenEvent.mjs";
import { HypervectorSet } from "./HypervectorSet.mjs";

/**
* @class Hyperedge-Event graph
* @author Mika Suominen
*/
class HyperedgeEvent extends TokenEvent {

	/**
	* Post-processing options.
	* @typedef {Object} PostProcesssingOptions
	* @property {boolean} bcoordinates If true, calculate branchial coordinates
	* @property {boolean} deduplicate If true, de-duplicate new edges
	* @property {boolean} merge If true, merge identical edges
	* @property {boolean} pathcnts If true, calculate path counts
	*/

	/**
	* @typedef {number[]} Edge
	* @typedef {Object} Rule
	*/

	/**
	* @constructor
	*/
	constructor() {
    super();
		this.L = new Map(); // Leafs
		this.P = new Map(); // Search patterns for leafs

		this.v = -1; // Current maximum vertex number

		this.limitid = -1; // Maximum id of the previous step
		this.limitevndx = 0; // Event index at the limit
		this.limittndx = 0; // Token index at the limit

		this.ham = new HypervectorSet(); // Hyperdimensional Associative Memory
	}

	/**
	* Clear.
	*/
	clear() {
    this.T.length = 0;
    this.EV.length = 0;
    this.id = -1;
		this.L.clear();
		this.P.clear();

		this.v = -1;

		this.limitid = -1;
		this.limitevndx = 0;
		this.limittndx = 0;
	}



	/**
	* Map negative vertices to real new vertices.
	* @param {Edge[]} es Array of edges with new vertices as neg numbers
	* @return {Edge[]} Array of real new edges.
	*/
	mapper( es ) {
		return es.map( e => e.map( v => ( v >= 0 ? v : (this.v - v) ) ) );
	}

	/**
	* Set token as a leaf.
	* @param {Token} t
	*/
	setLeaf( t ) {
		if ( !t.leaf ) {
			t.leaf = true;

			// Add search patterns
			const edge = t.edge;
			let k = edge.join(",");
			let es = this.L.get( k );
			es ? es.push( t ) : this.L.set( k, [ t ] );
			for( let i = edge.length-1; i>=0; i-- ) {
				k = edge.map( (x,j) => ( j === i ? x : "*" ) ).join(",");
				es = this.P.get( k );
				es ? es.push( t ) : this.P.set( k, [ t ] );
			}
		}
	}


	/**
	* Unset token as a leaf.
	* @param {Token} t
	*/
	unsetLeaf( t ) {
		if ( t.leaf ) {
			t.leaf = false;

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
		}
	}


	/**
	* Create a new event.
	* @param {Token[]} hits Left-hand side match
	* @param {Edge[]} adds Pattern of edges to add
	* @param {Rule} rule Rule
	* @param {number} step Step
	* @param {number} b Branch id
	* @return {Event} New event, null if not created.
	*/
	rewrite( hits, adds, rule, step, b ) {
    const ev = this.addEvent( hits );
    ev.rule = rule;
    ev.step = step;
    ev.b = b;

		const edges = this.mapper( adds );
		for( let i = 0; i < edges.length; i++ ) {
			// New token
			let t = this.addToken( ev );
			t.p = adds[i];
			t.edge = edges[i];
			ev.child.push( t );
		}

		return ev;
	}

	/**
	* Calculate and update the path count of the given token/event.
	* @param {(Token|Event)} ts Array of tokens.
	*/
	updatePathcnt( x ) {
		if ( x.hasOwnProperty("past") ) {
			// This is a token
			let pc = 0;
			x.parent.forEach( ev => {
				if ( !ev.hasOwnProperty("pathcnt") ) this.updatePathcnt( ev );
				pc += ev.pathcnt;
			});
			// The sum of parent events
			x.pathcnt = pc || 1;
		} else {
			let g = x.parent.slice();
			let cs = []; // branchlike counts
			while ( g.length ) {
				let t = g.pop();
				if ( !t.hasOwnProperty("pathcnt") ) this.updatePathcnt( t );
				let c = t.pathcnt;
				for( let i = g.length-1; i>=0; i-- ) {
					let s = this.separation( t, g[i] );
					if ( s !== 4 ) {
						// Max of spacelike/timelike tokens
						if ( !g[i].hasOwnProperty("pathcnt") ) this.updatePathcnt( g[i] );
						c = Math.max( c, g[i].pathcnt );
						g.splice( i, 1 );
					}
				}
				cs.push( c );
			}

			// The sum of branchlike tokens
			x.pathcnt = cs.reduce( (a,x) => a + x, 0 ) || 1;
		}
	}


	/**
	* Calculate and update the branchial coordinate of the given token/event.
	* @param {(Token|Event)} x
	*/
	updateBc( x ) {
		if ( x.parent.length ) {
			const bcs = []; // Branchial coordinates of parents
			let overlap = false;
			x.parent.forEach( y => {
				if ( !y.hasOwnProperty("bc") ) this.updateBc( y );
				bcs.push( y.bc );
				if ( y.child.length > 1 ) overlap = true;
			});
			if ( bcs.every( (y,_,arr) => y === arr[0] ) ) {
				// If all the coordinates are the same, reuse the object
				x.bc = bcs[0];
			} else {
				// Hypervector sum (majority)
				x.bc = this.ham.maj( bcs );
			}
			if ( !x.past && overlap ) {
				// Overlapping event, make a new branch
				x.bc = this.ham.maj( [ x.bc, this.ham.random() ] );
			}
		} else {
			x.bc = this.ham.random();
		}
	}

	/**
	* Hamming distance of two tokens/events in hyper-dimensional branchial space.
	* @param {(Token|Event)} x
	* @param {(Token|Event)} y
	* @return {number} Distance
	*/
	d( x, y ) {
		return this.ham.d( x.bc, y.bc );
	}

	/**
	* Pre-process to be called just before processing matches.
	*/
	preProcess() {
		// Set new limits; New events/tokens will be above these limits
		this.limitid = this.id;
		this.limitevndx = this.EV.length;
		this.limittndx = this.T.length;
	}

	/**
	* Post-process to be called just after processing matches.
	* @generator
	* @param {PostProcesssingOptions} opt Post-processing options.
	* @return {string} Status of post-processing.
	*/
	*postProcess( opt ) {

		// De-dublication
		if ( opt.hasOwnProperty("deduplicate") ) {
			if ( opt.deduplicate ) {
				let newevs  = this.EV.slice( this.limitevndx );
				let total = newevs.length;
				while( newevs.length ) {
					let ev = newevs.pop();
					let vs = [];
					ev.child.forEach( t => {
						t.edge = this.mapper( [ t.p ] )[0];
						vs.push( ...t.edge );
						this.setLeaf( t );
					});
					if ( ev.child.length ) {
						let ts = [ ev.child[0] ];
						let ps = ev.child.map( t => t.p.join(",") );
						for( let i = newevs.length-1; i >= 0; i-- ) {
							let ev2 = newevs[i];
							// There has to be children to de-duplicate
							if ( ev2.child.length ) {
								let t2 = ev2.child[0];
								let ps2 = ev2.child.map( t => t.p.join(",") );
								// Hyperedge patterns must overlap
								if ( ps2.some( p => ps.includes( p ) ) ) {
									// All the combined tokens must be branchlike separated
									if ( ts.every( t => this.separation( t, t2 ) === 4 ) ) {
										// Use the same map to create new vertices
										ev2.child.forEach( t => {
											t.edge = this.mapper( [ t.p ] )[0];
											vs.push( ...t.edge );
											this.setLeaf( t );
										});
										newevs.splice(i,1);
										ts.push( t2 );
										ps = [ ...new Set( [ ...ps, ...ps2 ] ) ];
									}
								}
							}
						}
					}

					// Keep track of max vertex id
					this.v = Math.max( this.v, ...vs );

					yield "DD ["+ Math.floor( ( total - newevs.length ) / total * 100 ) + "%]";
				}

			} else {
				// No de-duplication; Use unique maps for each event
				for( let i = this.limitevndx; i < this.EV.length; i++ ) {
					let vs = [];
					this.EV[i].child.forEach( t => {
						t.edge = this.mapper( [ t.p ] )[0];
						vs.push( ...t.edge );
						this.setLeaf( t );
					});
					// Keep track of max vertex id
					this.v = Math.max( this.v, ...vs );
				}
			}
		}

		// Merge identical new hyperedges
		if ( opt.hasOwnProperty("merge") && opt.merge ) {
			let total = this.L.size;
			let cnt = 0;
			for( let l of this.L.values() ) {
				let ts = l.filter( t => t.id > this.limitid ).sort( (a,b) => a.id - b.id );
				for( let i=0; i<ts.length-1; i++ ) {
					let cs = [ ts[i] ];
					for( let j=ts.length-1; j>=i+1; j-- ) {
						if ( cs.every( t => this.separation( t, ts[j] ) === 4 ) ) {
							cs.push( ts[j] );
							ts.splice( j, 1 );
						}
					}
					cs.forEach( (t,i,arr) => {
						if ( i ) {
							this.unsetLeaf( t );
							this.merge( arr[0], t );
						}
					});
				}

				yield "MERGE ["+ Math.floor( (++cnt / total) * 100 ) + "%]";
			}
		}

		// Calculate path counts
		if ( opt.hasOwnProperty("pathcnts") && opt.pathcnts ) {
			let total = this.EV.length - this.limitevndx;
			for( let i = this.limitevndx; i < this.EV.length; i++ ) {
				this.updatePathcnt( this.EV[i] );
				this.EV[i].child.forEach( t => this.updatePathcnt( t ) );

				yield "PATHCNT ["+ Math.floor( (i-this.limitevndx) / total * 100) + "%]";
			}
		}

		// Calculate branchial coordinates
		if ( opt.hasOwnProperty("bcoordinates") && opt.bcoordinates ) {
			let total = this.EV.length - this.limitevndx;
			for( let i = this.limitevndx; i < this.EV.length; i++ ) {
				this.updateBc( this.EV[i] );
				this.EV[i].child.forEach( t => this.updateBc( t ) );

				yield "BC ["+ Math.floor( (i-this.limitevndx) / total * 100) + "%]";
			}
		}

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
	* Return all the possible combinations of the given a list of hyperedges.
	* @param {Edge[]} edges Array of edges
	* @param {number} int Allowed separations
	* @return {Token[][]} Arrays of edge objs
	*/
	hits( edges, int ) {
		const h = [];
		for( let i = 0; i<edges.length; i++ ) {
			let ts = this.L.get( edges[i].join(",") );
			if ( !ts ) return []; // Some edge doesn't exist
			h.push( ts );
		}

		// All possible combinations
		let hits = [];
		for( let c of this.cartesian(h) ) {
			// Filter out already processed combinations
			if ( c.every( x => x.id <= this.limitid ) ) continue;

			// Filter out combinations with duplicate edge ids
			if ( c.some( (x,i,arr) => arr.indexOf(x) !== i ) ) continue;

			// Filter out based on the allowed interactions
			if ( !this.isSeparation( c, int ) ) continue;

			hits.push( c );
		}

		return hits;
	}

	/**
	* Find edges that match to the given wild card search pattern.
	* @param {Edge} p Search pattern, wild card < 0
	* @return {Edge[]} Matching hyperedges.
	*/
	find( p ) {
		let found = [];
		let wilds = p.reduce( (a,x) => a + ( x < 0 ? 1 : 0 ), 0 );
		if ( wilds === 0 ) {
			// No wild cards, so we look for an exact match
			if ( this.L.has( p.join(",") ) ) found.push( p );
		} else if ( wilds === p.length ) {
			// Only wild cards, so we return all edges of the given length
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
	* Worldline of a given set of spatial vertices.
	* @param {number[]} vs An array of vertices.
	* @return {Edge[]} Array of causal edges.
	*/
	worldline( vs ) {
		let es = [];
		let iprev;
		this.EV.forEach( ev => {
			let adds = [ ...ev.child.map( t => t.edge ).flat() ];
			if ( vs.some( x => adds.includes(x) ) ) {
				if ( iprev ) es.push( [iprev,ev.id] );
				iprev = ev.id;
			}
		});
		return es;
	}

	/**
	* Status.
	* @return {Object} Status of the hypergraph.
	*/
	status() {
		return { events: this.EV.length };
	}

}

export { HyperedgeEvent };
