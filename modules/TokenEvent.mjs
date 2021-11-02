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
		const is = s.reduce((a,b) => [...b].filter(x => a.includes(x) ), [ ...s[0] ]);

		// Outdegree = 0
		const lca = is.filter(x => x.child.every( y => !is.includes(y) ));

		return lca;
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
	* Calculate and set the path count of the given token/event.
	* @param {(Token|Event)} ts Array of tokens.
	* @param {boolean} [reset=false] If true, recalculate and reset.
	*/
	setPathcnt( x, reset=false ) {
		if ( !reset && x.hasOwnProperty("pathcnt") ) return; // Already set
		if ( x.hasOwnProperty("past") ) {
			// This is a token
			let pc = 0;
			x.parent.forEach( ev => {
				if ( !ev.hasOwnProperty("pathcnt") ) this.setPathcnt( ev );
				pc += ev.pathcnt;
			});
			// The sum of parent events
			x.pathcnt = pc || 1;
		} else {
			// This is an event
			let g = x.parent.slice();
			let cs = []; // branchlike counts
			while ( g.length ) {
				let t = g.pop();
				if ( !t.hasOwnProperty("pathcnt") ) this.setPathcnt( t );
				let c = t.pathcnt;
				for( let i = g.length-1; i>=0; i-- ) {
					let s = this.separation( t, g[i] );
					if ( s !== 4 ) {
						// Max of spacelike/timelike tokens
						if ( !g[i].hasOwnProperty("pathcnt") ) this.setPathcnt( g[i] );
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
	* Calculate and set the branchial coordinate of the given token/event.
	* @param {(Token|Event)} x
	* @param {boolean} [reset=false] If true, recalculate and reset.
 	*/
	setBc( x, reset = false ) {
		if ( !reset && x.hasOwnProperty("bc") ) return; // Already set
		x.parent.forEach( y => {
			if (!y.hasOwnProperty("bc") ) this.setBc( y ); // Make sure parents have coordinates
		});
		if ( x.hasOwnProperty("past") ) {
			if ( x.parent.length === 1 ) {
				// One parent event, reuse coordinate
				x.bc = x.parent[0].bc;
			} else {
				// Majority of the lowest common ancestors of parent's parents
				const pps = [ ...new Set( x.parent.map( y => y.parent ).flat() ) ];
				if ( pps.length === 0 || this.isSeparation( pps, 1 ) ) {
					x.bc = x.parent[0].bc;
				} else {
					const lca = TokenEvent.lca( pps.map( y => y.past ) );
					if ( lca.length === 0 ) {
						x.bc = x.parent[0].bc;
					} else if ( lca.length === 1 ) {
						x.bc = lca[0].bc;
					} else {
						x.bc = HDC.maj( lca.map( y => y.bc ) );
					}
				}
			}
		} else {
			if ( x.parent.length === 0 ) {
				// Initial event
				x.bc = HDC.random();
			} else {
				// Majority of the lowest common ancestors of parents
				if ( x.parent.length === 1 ) {
					x.bc = x.parent[0].bc;
				} else if ( this.isSeparation( x.parent, 1 ) ) {
					if ( x.parent.every( y => y.bc === x.parent[0].bc ) ) {
						x.bc = x.parent[0].bc;
					} else {
						x.bc = HDC.maj( x.parent.map( y => y.bc ) );
					}
				} else {
					const lca = TokenEvent.lca( x.parent.map( y => y.past ) );
					if ( lca.length === 0 ) {
						x.bc = x.parent[0].bc;
					} else if ( lca.length === 1 ) {
						x.bc = lca[0].bc;
					} else {
						x.bc = HDC.maj( lca.map( y => y.bc ) );
					}
				}
				// If overlapping event, separate branches
				if ( x.parent.some( y => y.child.length > 1 ) ) {
					x.bc = HDC.maj( [ x.bc, HDC.random() ] );
				}
			}
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
			if ( d < limit ) {
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
