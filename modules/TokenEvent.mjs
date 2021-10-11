import { HSet } from "./HSet.mjs";

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
	* @property {number} pathcnt Path count
	*/

	/**
	* @typedef {Object} Event
	* @property {number} id Identifier
	* @property {Token[]} parent Parent tokens
	* @property {Token[]} child Child tokens
	* @property {Hypervector} bc Branchial coordinate as a hypervector
	* @property {number} pathcnt Path count
	*/

	/**
	* @constructor
	*/
	constructor() {
		this.T = []; // Tokens
		this.EV = []; // Events
		this.id = -1; // Maximum id
		this.ham = new HSet(); // Hyperdimensional Associative Memory
	}


	/**
	* Lowest common ancestors of two arrays.
	* @static
	* @param {Set} s1
	* @param {Set} s2
	*/
	static lca( s1, s2 ) {
		// Intersection
		const is = new Set();
		for( let x of s1 ) {
			if ( s2.has(x) ) {
				is.add( x );
			}
		}

		// Lowest common ancestors, outdegree = 0
		const lca = [];
		for( let x of is ) {
			if ( x.child.every( y => !is.has(y) ) ) {
				lca.push( x );
			}
		}

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
			past: new Set(),
			pathcnt: ev.pathcnt
		};

		// Past causal cone
		t.past.add( t );
		if ( ev ) {
			t.past.add( ev );
			ev.parent.forEach( x => t.past.add( ...x.past ) );
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
			child: [],
			pathcnt: this.pathcnt( ts )
		};
		this.EV.push( ev );

		// Process hit
		ts.forEach( t => {
			t.child.push( ev );
		});

		// Brancial coordinate
		ev.bc = this.coordinate( ev );

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
					t.past.add( t );
					t.parent.forEach( x => {
						t.past.add( x );
						x.parent.forEach( x => t.past.add( ...x.past ) );
					});

					// Update path count
					t.pathcnt = this.pathcnt2( t );
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
			ev.bc = this.coordinate( ev );
		});
		t2.child.length = 0;

		// Switch parents
		t2.parent.forEach( ev => {
			let idx = ev.child.indexOf( t2 );
			ev.child[idx] = t1;
			t1.parent.push( ev );
			ev.bc = this.coordinate( ev );
		});
		t2.parent.length = 0;

		// Update the past and path count
		t1.past.add( ...t2.past );
		t1.past.delete( t2 );
		t1.pathcnt = this.pathcnt2( t1 );

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
		let lca = TokenEvent.lca( t1.past, t2.past );

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
	* Path count of given tokens.
	* @param {Token[]} ts Array of tokens.
	* @return {number} Path count.
	*/
	pathcnt( ts ) {
		let g = ts.slice();
		let cs = []; // branchlike counts
		while ( g.length ) {
			let t = g.pop();
			let c = t.pathcnt;
			for( let i = g.length-1; i>=0; i-- ) {
				let s = this.separation( t, g[i] );
				if ( s !== 4 ) {
					// max of spacelike/timelike tokens
					c = Math.max( c, g[i].pathcnt );
					g.splice( i, 1 );
				}
			}
			cs.push( c );
		}
		// return the sum of branchlike tokens
		return cs.reduce( (a,x) => a + x, 0 ) || 1;
	}

	/**
	* Path count of a given token.
	* @param {Token} t
	* @return {number} Path count.
	*/
	pathcnt2( t ) {
		let ts = [];
		t.parent.forEach( ev => ts.push( ...ev.parent ) );
		ts = [ ...new Set( ts ) ];
		return this.pathcnt( ts );
	}

	/**
	* Calculate the branchial coordinate of an event.
	* @param {Event} ev
	* @return {Hypervector} Branchial coordinate.
	*/
	coordinate( ev ) {
		let bc;
		let bcs = []; // Branchial coordinates of ancestor events
		let overlap = false;

		if ( ev.parent.length ) {
			ev.parent.forEach( t => {
				bcs.push( ...t.parent.map( x => x.bc ) );
				if ( t.child.length > 1 ) overlap = true;
			});
			if ( bcs.every( (x,_,arr) => x === arr[0] ) ) {
				bc = bcs[0];
			} else {
				bc = this.ham.maj( bcs );
			}
			if ( overlap ) {
				bc = this.ham.maj( [ bc, this.ham.random() ] );
			}
		} else {
			bc = this.ham.random();
		}

		return bc;
	}

	/**
	* Hamming distance of two tokens in hyper-dimensional branchial space.
	* @param {Token} t1
	* @param {Token} t2
	* @return {number} Distance
	*/
	distance( t1, t2 ) {
		let bc1 = this.ham.maj( [ ...new Set( t1.parent.map( x => x.bc ) ) ] );
		let bc2 = this.ham.maj( [ ...new Set( t2.parent.map( x => x.bc ) ) ] );
		return this.ham.d( bc1, bc2 );
	}

	/**
	* Hamming distance of two events in hyper-dimensional branchial space.
	* @param {Event} ev1
	* @param {Event} ev2
	* @return {number} Distance
	*/
	distance2( ev1, ev2 ) {
		return this.ham.d( ev1.bc, ev2.bc );
	}

}

export { TokenEvent };
