
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
	* @property {number} pathcnt Path count
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
	* Add a new token.
	* @param {Event} ev Parent event
	* @return {Token} New token.
	*/
	addToken( ev ) {
		const t = {
			id: ++this.id,
			parent: [ ev ],
			child: [],
			past: [],
			pathcnt: ev.pathcnt
		};

		// Past causal cone
		t.past.push( t );
		if ( ev ) {
			t.past.push( ev );
			ev.parent.forEach( x => t.past.push( ...x.past ) );
			t.past = [ ...new Set( t.past ) ];
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
			// Delete childs
			t.child.forEach( ev => {
				this.deleteEvent(ev);
			});

			// Remove from parents
			t.parent.forEach( ev => {
				ev.child.splice( ev.child.indexOf( t ), 1);
			});

			// Remove edge
			this.T.splice( idx, 1);
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

		return ev;
	}

	/**
	* Undo an event.
	* @param {Event} ev
	*/
	deleteEvent( ev ) {
		let idx = this.EV.indexOf( ev );
		if ( idx !== -1 ) {
			// Remove childs
			ev.child.forEach( t => {
				if ( t.parent.length === 1 ) {
					this.deleteToken( t );
				} else {
					t.parent.splice( t.parent.indexOf( ev ), 1);

					// Update past cone
					t.past.push( t );
					t.parent.forEach( x => {
						t.past.push( x );
						x.parent.forEach( x => t.past.push( ...x.past ) );
					});
					t.past = [ ...new Set( t.past ) ];

					// Update path count
					t.pathcnt = this.pathcnt2( t );
				}
			});

			// Process parents
			ev.parent.forEach( t => {
				t.child.splice( t.child.indexOf( ev ), 1);
			});

			// Remove event
			this.EV.splice(idx,1);
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

		// Update the past and path count
		t1.past = [ ...new Set( [ ...t1.past, ...t2.past.slice(1) ] ) ];
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

		// Intersection of past causal cones
		let c = t1.past.filter( x => t2.past.includes(x) );

		// Lowest Common Ancestors i.e. outdegree = 0
		let lca = c.filter( x => x.child.every( y => !c.includes(y) ) );

		if ( lca.includes(t1) || lca.includes(t2) ) return 2; // timelike
		if ( lca.some( l => l.past ) ) return 4; // branchlike
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

}

export { TokenEvent };
