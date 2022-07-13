import { HDC } from "./HDC.mjs";

/**
* @class Token-Event graph
* @author Mika Suominen
*/
class TokenEvent {

	/**
	* @typedef {Object} Token
	* @property {number} id Identifier
	* @property {Event[]} parent Parent events
	* @property {Event[]} child Child events
	* @property {Object[]} past Past causal cone
	* @property {Hypervector} bc Branchial coordinate
	*/

	/**
	* @typedef {Object} Event
	* @property {number} id Identifier
	* @property {Token[]} parent Parent tokens
	* @property {Token[]} child Child tokens
	* @property {Hypervector} bc Branchial coordinate
	*/

	/**
	* @constructor
	*/
	constructor() {
		this.T = []; // Tokens
		this.EV = []; // Events
		this.id = -1; // Maximum id
	}


	/**
	* Lowest common ancestors of the given arrays.
	* @static
	* @param {Set[]} s
	* @return {(Token|Event)[]} Lower common ancestors.
	*/
	static lca( s ) {
		// Intersection
		const is = s.reduce((a,b) => {
			const c = new Set();
			for( const v of a ) {
				if ( b.has(v) ) {
					c.add(v);
				}
			}
      return c;
		});

		// Outdegree = 0
		const z = [...is].filter( x => x.child.every( y => !is.has(y) ) );

		return z;
	}

	/**
	* Add a new token.
	* @param {Event} ev Parent event
	* @return {Token} New token.
	*/
	addToken( ev ) {
		const t = {
			id: ++this.id,
			parent: [ ev ],
			child: [],
			past: new Set()
		};

		// Past causal cone
		t.past.add( t );
		if ( ev ) {
			t.past.add( ev );
			ev.parent.forEach( x => x.past.forEach( y => t.past.add( y ) ) );
		}

		this.T.push( t );

		return t;
	}

	/**
	* Delete a token.
	* @param {Token} t
	*/
	deleteToken( t ) {
		let idx = this.T.indexOf( t );
		if ( idx !== -1 ) {
			// Remove edge
			this.T.splice( idx, 1);

			// Remove from parents
			t.parent.forEach( ev => {
				ev.child.splice( ev.child.indexOf( t ), 1);
			});

			// Delete childs
			t.child.forEach( ev => {
				if ( ev.parent.length === 1 ) {
					ev.parent.length = 0;
					this.deleteEvent( ev );
				} else {
					ev.parent.splice( ev.parent.indexOf( t ), 1);
				}
			});
		}
	}

	/**
	* Create a new event.
	* @param {Token[]} ts Parent tokens
	* @return {Event} New event
	*/
	addEvent( ts ) {
		// Add a new rewriting event
		const ev = {
			id: ++this.id,
			parent: ts,
			child: []
		};
		this.EV.push( ev );

		// Process hit
		ts.forEach( t => {
			t.child.push( ev );
		});

		return ev;
	}

	/**
	* Undo an event.
	* @param {Event} ev
	*/
	deleteEvent( ev ) {
		let idx = this.EV.indexOf( ev );
		if ( idx !== -1 ) {
			// Remove event
			this.EV.splice(idx,1);

			// Process parents
			ev.parent.forEach( t => {
				t.child.splice( t.child.indexOf( ev ), 1);
			});

			// Remove childs
			ev.child.forEach( t => {
				if ( t.parent.length === 1 ) {
					t.parent.length = 0;
					this.deleteToken( t );
				} else {
					t.parent.splice( t.parent.indexOf( ev ), 1);

					// Update past cone
					t.past = new Set();
					t.past.add( t );
					t.parent.forEach( x => {
						t.past.add( x );
						x.parent.forEach( x => x.past.forEach( y => t.past.add( y ) ) );
					});
				}
			});
		}
	}

	/**
	* Merge two tokens.
	* @param {Token} t1
	* @param {Token} t2
	*/
	merge( t1, t2 ) {
		// Sort based on ids
		if ( t1.id > t2.id ) {
			[ t1, t2 ] = [ t2, t1 ];
		}

		// Switch childs
		t2.child.forEach( ev => {
			let idx = ev.parent.indexOf( t2 );
			ev.parent[idx] = t1;
			t1.child.push( ev );
		});
		t2.child.length = 0;

		// Switch parents
		t2.parent.forEach( ev => {
			let idx = ev.child.indexOf( t2 );
			ev.child[idx] = t1;
			t1.parent.push( ev );
		});
		t2.parent.length = 0;

		// Update the past, path count and branchial coordinate
		t2.past.forEach( y => t1.past.add( y ) );
		t1.past.delete( t2 );

		// Remove the extra token
		this.deleteToken( t2 );
	}

	/**
	* Separation of two tokens.
	* @param {Token} t1
	* @param {Token} t2
	* @return {number} 0 = same, 1 = spacelike, 2 = timelike, 4 = branchlike
	*/
	separation( t1, t2 ) {
		if ( t1 === t2 ) return 0; // same

		// Lowest Common Ancestors
		let lca = TokenEvent.lca( [ t1.past, t2.past ] );

		if ( lca.includes(t1) || lca.includes(t2) ) return 2; // timelike
		if ( lca.some( l => l.hasOwnProperty("past") ) ) return 4; // branchlike
		return 1; // spacelike
	}

	/**
	* Check if all given tokens are connected only through the allowed ways.
	* @param {Token[]} ts Array of tokens.
	* @param {number} int Allowed interactions.
	* @return {boolean} True, if connected only in allowed ways.
	*/
	isSeparation( ts, int ) {
		for( let i=0; i<ts.length-1; i++ ) {
			for( let j=i+1; j<ts.length; j++ ) {
				let s = this.separation( ts[i], ts[j] );
				if ( !(s & int) ) return false;
			}
		}
		return true;
	}


	/**
	* Calculate probability of a token t relative to the given token tref
	* @param {Token} tref Reference token
	* @param {Token} t Target token
	* @param {Set} s Set of visible tokens
	* @return {number} Probability 0-1
	*/
	probability( tref, t, s ) {
		// Same token, probability 1
		if ( tref === t ) return 1;

		// Lowest Common Ancestors
		let lca = TokenEvent.lca( [ tref.past, t.past ] );
		if ( lca.includes(tref) || lca.includes(t) ) {
			// timelike separated, probability to see t is 1
			return 1;
		} else if ( lca.some( x => x.hasOwnProperty("past") ) ) {
			// branchlike separated, probability to see t is 0
			return 0;
		} else {
			let a = 0;
		  let b = 0;
			for( const x of s.keys() ) {
				if ( x === tref ) {
					continue;
				} else if ( x === t ) {
					a = a + 1;
					b = b + 1;
					continue;
				} else {
					lca = TokenEvent.lca( [ tref.past, x.past ] );
					if ( lca.every( x => !x.hasOwnProperty("past") ) ) {
						lca = TokenEvent.lca( [ t.past, x.past ] );
						if ( lca.every( x => !x.hasOwnProperty("past") ) ) {
							b = b + 1;
						}
					}
				}
			}
			return(b>0?a/b:1)
		}

		// calculate probability
/*		let n = 0; // Count of t all spacelike separated pairs (tref,x)
		let cnt = 0; // Count of times t is spacelike separated to pair (tref,x)
		for( const x of s.keys() ) {
			if ( x === tref ) continue;
			if ( x === t ) {
				n = n + 1;
				cnt = cnt + 1;
				continue;
			}
			lca = TokenEvent.lca( [ tref.past, x.past ] );
			if ( lca.some( x => x.hasOwnProperty("past") ) ) continue;
			let pairpast = new Set( [ ...tref.past, ...x.past ] );
			n = n + 1;
			lca = TokenEvent.lca( [ t.past, pairpast ] );
			if ( lca.some( x => x.hasOwnProperty("past") ) ) continue;
			cnt = cnt + 1;
		}
		return (n>0 ? cnt / n : 1); */
	}

	/**
	* Calculate and set the path count of the given token/event.
	* @param {(Token|Event)} x Token/event
	* @param {boolean} [reset=false] If true, recalculate and reset.
	*/
	setPathcnt( x, reset=false ) {
		if ( !reset && x.hasOwnProperty("pathcnt") ) return; // Already set
		if ( x.parent.length === 0 ) {
			// No parents -> 1
			x.pathcnt = 1;
		} else {
			// Ensure all parents have been calculated
			x.parent.forEach( p => {
				if ( !p.hasOwnProperty("pathcnt") ) this.setPathcnt( p );
			});
			if ( x.hasOwnProperty("past") ) {
				// This is a token -> sum of the parents path counts
				x.pathcnt = x.parent.reduce( (a,y) => a + y.pathcnt, 0 );
			} else {
				// This is an event -> minimun of the parents' path counts
				x.pathcnt = Math.min( ...x.parent.map( y => y.pathcnt ) );
			}
		}
	}

	/**
	* Calculate and set the branchial coordinate of the given token/event.
	* @param {(Token|Event)} x
	* @param {boolean} [reset=false] If true, recalculate and reset.
 	*/
	setBc( x, reset = false ) {
		if ( !reset && x.hasOwnProperty("bc") ) return; // Already set

		// Make sure all parents have coordinates
		x.parent.forEach( y => {
			if (!y.hasOwnProperty("bc") ) this.setBc( y );
		});

		// Find out parent coordinates
		let bcs;
		if ( x.parent.length === 0 ) {
			bcs = [ HDC.random() ]; // Initial event, use random
		} else if ( x.parent.length === 1 ) {
			bcs = [ x.parent[0].bc ]; // Single parent, inherit
		} else {
			bcs = x.parent.map( y => y.bc ); // Use immediate parents by default
			const ps = x.hasOwnProperty("past") ? [ ...new Set( x.parent.map( y => y.parent ).flat() ) ] : x.parent;
			if ( ps.length ) {
				const lca = TokenEvent.lca( ps.map( y => y.past ) );
				if ( lca.length ) {
					bcs = lca.map( y => y.bc ); // Lowest common ancestors
				}
			}
		}

		// Use majority rule
		if ( bcs.length === 1 || bcs.every( y => y === bcs[0] ) ) {
			x.bc = bcs[0];
		} else {
			x.bc = HDC.maj( bcs );
		}

		// If overlaps in rewrites, separate based on random coordinate
		if ( !x.hasOwnProperty("past") && x.parent.some( y => y.child.length > 1 ) ) {
			x.bc = HDC.maj( [ x.bc, HDC.random() ] );
		}
	}

	/**
	* Calculate and set k Nearest Neighbours (k-NN).
	* Note: Only calculated for tokens.
	* @param {Token} x
	* @param {number} k Number of nearest neighbours to calculate.
	* @param {number} cutoff Below this Hamming distance, consider the same
	* @param {boolean} [reset=false] If true, recalculate and reset.
	*/
	setNN( x, k, cutoff, reset = false ) {
		if ( !reset && x.hasOwnProperty("nn") ) return; // Already set

		let limit = Infinity;
		let nn = new Array(k).fill().map( _ => {
			return { t:null, d: limit };
		});
		let ndx = this.T.indexOf(x);
		for( let i=ndx-1; i>=0; i-- ) {
			if ( !this.T[i].hasOwnProperty("nn") ) {
				this.setNN( this.T[i], k, reset, cutoff );
			}

			// Identical tokens
			if ( x.bc === this.T[i].bc ) {
				if ( this.T[i].nn[0].d < cutoff ) {
					nn = this.T[i].nn;
				} else {
					nn[0].t = this.T[i];
					nn[0].d = 0;
					for( let j=1; j<k; j++ ) {
						nn[j].t = null;
						nn[j].d = Infinity;
					}
				}
				break;
			}

			// Ignore tokens below cutoff Hamming dist to some other token
			if ( this.T[i].nn[0].d < cutoff ) continue;

			// k-NN using Hamming distances
			let d = 0;
			for( let j=0; j<320 && d<limit; j++ ) {
				let n = (x.bc[j] ^ this.T[i].bc[j]);
				n = n - ((n >>> 1) & 0x55555555);
				n = (n & 0x33333333) + ((n >>> 2) & 0x33333333);
				d += ((n + (n >>> 4) & 0xF0F0F0F) * 0x1010101) >>> 24;
			}
			if ( d < cutoff ) {
				for( let j=1; j<k; j++ ) {
					nn[j].t = null;
					nn[j].d = Infinity;
				}
				nn[0].t = this.T[i];
				nn[0].d = d;
				break;
			} else if ( d < limit ) {
				nn[k-1].t = this.T[i];
				nn[k-1].d = d;
				nn.sort( (a,b) => a.d - b.d );
				limit = nn[k-1].d;
			}
		}
		x.nn = nn;
	}

}

export { TokenEvent };
