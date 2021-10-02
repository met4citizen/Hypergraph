import { Rulial } from "./Rulial.mjs";
import { HyperedgeEvent } from "./HyperedgeEvent.mjs";

/**
* @class Hypergraph Rewriting System.
* @author Mika Suominen
*/
class Rewriter {

	/**
	* Rewriting rule.
	* @typedef {Object} Pattern
	*/

	/**
	* Rewriting options.
	* @typedef {Object} Options
	* @property {number} evolution Number of branches to evolve, 0 = full multiway
	* @property {number} interactions Combination of allowed separations; 1=spacelike, 2=timelike, 4=branchlike
	* @property {number} maxevents Maximum number of events
	* @property {number} timeslot Processing unit in msec
	* @property {boolean} noduplicates If true, duplicate edges in rules are ignored
	* @property {boolean} deduplicate If true, de-duplicate new edges
	* @property {boolean} wolfram If true, use Wolfram default order/reverse for branches 1/2
	* @property {boolean} rulendx If true, order based on rule index
	*/

	/**
	* Callback for rewriting progress update.
	* @callback progressfn
	* @param {numeric} eventcnt Number of events processed.
	*/

	/**
	* Callback for rewriting finished.
	* @callback finishedfn
	*/

	/**
	* Creates an instance of Rewriter.
	* @constructor
	*/
	constructor() {
    this.rulial = new Rulial(); // Rulial foliation
		this.multiway = new HyperedgeEvent(); // Multiway system
		this.M = []; // LHS hits as maps
		this.reset();
	}

	/**
	* Reset instance.
	* @param {Options} [opt=null]
	*/
	reset( opt = null ) {
		opt = opt || {};
    this.rulial.clear();

		this.step = -1;
		this.M.length = 0;
		this.eventcnt = 0;
		this.opt = {
			evolution: opt.hasOwnProperty("evolution") ? opt.evolution : 1,
			interactions: opt.hasOwnProperty("interactions") ? opt.interactions : 5,
			timeslot: opt.hasOwnProperty("timeslot") ? opt.timeslot : 250,
			noduplicates: opt.hasOwnProperty("noduplicates") ? opt.noduplicates : false,
			deduplicate: opt.hasOwnProperty("deduplicate") ? opt.deduplicate : false,
			wolfram: opt.hasOwnProperty("wolfram") ? opt.wolfram : false,
			rulendx: opt.hasOwnProperty("rulendx") ? opt.rulendx : false
		};
		this.opt.maxevents = opt.maxevents || (this.opt.evolution || 4) * 1000;
		this.multiway.clear();

		this.timerid = null; // Timer
		this.rewritedelay = 50; // Timer delay in msec
		this.progressfn = null; // Callback for rewrite progress
		this.finishedfn = null; // Callback for rewrite finished

		this.progress = { // Real-time statistics about rewriting process
			progress: 0,
			step: "0",
			matches: "0",
			events: "0",
			merge: ""
		};
		this.interrupt = false; // If true, user stopped the rewriting process
	}

	/**
	* Map subgraph pattern to real subgraph using 'map'.
	* @param {Pattern[]} ps Patterns to map
	* @param {number[]} map Map from pattern to real vertices
	* @return {Edge[]} Real subgraph.
	*/
	mapper( ps, map ) {
		return ps.map( p => p.map( v => ( v < map.length ? map[v] : ( map.length - v ) - 1 ) ) );
	}

	/**
	* Test whether an edge matches the given pattern.
	* @param {Edge} edge Hyperedge to test
	* @param {Edge} p Pattern to test against
	* @return {boolean} True if the edge matches the pattern
	*/
	isMatch( edge, p ) {
		if ( edge.length !== p.length ) return false;
		for( let i=p.length-1; i>0; i-- ) {
			let x = p.indexOf( p[i] );
			if ( x !== i && edge[x] !== edge[i] ) return false;
		}
		return true;
	}

	/**
	* Get the number of of neg hits.
	* @param {Rule} rule
	* @param {number[]} map
	* @param {Edge[]} [ignore=null] Hit to ignore
	* @return {number} Number of hits
	*/
	negs( rule, map, ignore ) {
		let map0 =  rule.negmap.slice();
		map.forEach( (x,i) => map0[i] = x );
		let mapsNext = [ map0 ];

		for( let j = 0; j < rule.neg.length; j++ ) {
			let pattern = rule.neg[j];
			let maps = mapsNext;
			mapsNext = [];

			// Iterate all mapping hypotheses
			for( let k = maps.length-1; k >= 0; k-- ) {
				let edges = this.multiway.find( this.mapper( [ pattern ], maps[k] )[0] );
				for (let l = edges.length-1; l >= 0; l-- ) {
					if ( !this.isMatch( edges[l], pattern ) ) continue;
					let map = maps[k];
					for(let n = pattern.length - 1; n >= 0; n-- ) map[ pattern[n] ] = edges[l][n];
					mapsNext.push( [ ...map ] );
				}
			}
		}

		let fullrule = [ ...rule.lhs, ...rule.neg ];
		let cnt = 0;
		for( let k = mapsNext.length-1; k >=0; k-- ) {
			let hits = this.multiway.hits( this.mapper( fullrule, mapsNext[k] ), this.opt.interactions );
			cnt += hits.length;

			// Ignore hits with tokens from 'ignore'
			if ( ignore ) {
				hits.forEach( h => {
					if ( h.length === ignore.length && h.every( (t,i) => t === ignore[i] ) ) {
						cnt--;
					}
				});
			}
		}

		return cnt;
	}

	/**
	* Find possible mappings between rule pattern 'lhs' and the hypergraph.
	* @generator
	*/
	*findMatches() {
		// Clear previous matches
		this.M.length = 0;

		// Check each edge for hit
		for( let e of this.multiway.L.values() ) {
			let edge = e[0].edge;

			// Go through all the rules
			for( let i=0; i < this.rulial.rules.length; i++ ) {
				let rule = this.rulial.rules[i];

				// Next rule, if the edge doesn't match the rule
				if ( !this.isMatch( edge, rule.lhs[0] ) ) continue;

				// Map based on this edge
				let map0 = rule.lhsmap.slice();
				for( let n = edge.length - 1; n >=0; n-- ) map0[ rule.lhs[0][n] ] = edge[n];

				// Go through all the other parts of the lhs rule
				let mapsNext = [ map0 ];
				let len = rule.lhs.length;
				for( let j = 1; j < len; j++ ) {
					let pattern = rule.lhs[j];
					let maps = mapsNext;
					mapsNext = [];

					// Iterate all mapping hypotheses
					for( let k = maps.length-1; k >= 0; k-- ) {
						let edges = this.multiway.find( this.mapper( [ pattern ], maps[k] )[0] );
						for (let l = edges.length-1; l >= 0; l-- ) {
							if ( !this.isMatch( edges[l], pattern ) ) continue;
							let map = maps[k];
							for(let n = pattern.length - 1; n >= 0; n-- ) map[ pattern[n] ] = edges[l][n];
							mapsNext.push( [ ...map ] );
						}
					}
				}

				// Filter out hypotheses that match 'neg'
				if ( rule.hasOwnProperty("neg") ) {
					mapsNext = mapsNext.filter( map => !this.negs( rule, map ) );
				}

				// Replicate according to the final results
				for( let k = mapsNext.length-1; k >= 0; k-- ) {
					let hits = this.multiway.hits( this.mapper( rule.lhs, mapsNext[k] ), this.opt.interactions );
					for( let l = hits.length-1; l >= 0; l-- ) {
						this.M.push( {
							hit: hits[l],
							map: mapsNext[k],
							rule: rule
						} );
					}
				}
			}

			yield;
		}

	}

	/**
	* Generate random sequence of indeces.
	*/
	orderRandom() {
		// Shuffle matches
		let arr = [...Array(this.M.length)].map((_,i) => i);
		for (let i = arr.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[arr[i], arr[j]] = [arr[j], arr[i]];
		}
		return arr;
	}

	/**
	* Generate indices in the order of default Wolfram Model ordering
	* (LeastRecentEdge + RuleOrdering + RuleIndex)
	*/
	orderWM() {
		let arr = this.orderRandom();
		arr.sort( (a,b) => {
			let am = this.M[a];
			let bm = this.M[b];
			let ai = am.hit.map( (e,i) => e.id );
			let bi = bm.hit.map( (e,i) => e.id );
			let ar = Array.from( Array(ai.length).keys() ).sort( (x,y) => ai[x] - ai[y] );
			let br = Array.from( Array(bi.length).keys() ).sort( (x,y) => bi[x] - bi[y] );
			let av = ai.sort().reverse();
			let bv = bi.sort().reverse();
			const len = Math.min( av.length, bv.length );
			for(let i = 0; i < len; i++ ) {
				if ( av[i] !== bv[i] ) return av[i] - bv[i];
			}
			for(let i = 0; i < len; i++ ) {
				if ( ar[i] !== br[i] ) return ar[i] - br[i];
			}
			return am.rule.id - bm.rule.id;
		});
		return arr;
	}


	/**
	* Process the given rewriting rule 'lhs' 'rhs' using the given
	* array of mappings 'maps'.
	* @generator
	* @param {number} b Branch 2^id
	*/
	*processMatches( b ) {

		// Processing order
		let order;
		if ( this.opt.wolfram && b === 1 ) {
			order = this.orderWM();
		} else if ( this.opt.wolfram && b === 2 ) {
			order = this.orderWM().reverse();
		} else {
			order = this.orderRandom();
		}

		// Rule ordering
		if ( this.opt.rulendx && this.rulial.rules.length > 1 ) {
				order.sort( (a,b) => this.M[a].rule.id - this.M[b].rule.id );
		}

		// Process matches
		for( let idx of order ) {
			let m = this.M[idx];

			if ( b ) {
				// If no duplicates set, test only with no duplicates
				let hit = m.hit;
				if ( this.opt.noduplicates ) {
					hit = hit.filter( (_,i) => !m.rule.lhsdup[i] );
				}

				// None of the edges can't already be used by b
				let bsc = hit.map( t => t.child.reduce( (a,x) => a | x.b, 0) );
				if ( bsc.some( x => x & b ) ) continue;

				// If branchlike allowed, one of the edges must be accessible to b
				// Otherwise, all the edges must be accessible to b
				let bsp = m.hit.map( t => t.parent.reduce( (a,x) => a | x.b, 0) );
				if ( this.opt.interactions & 4 ) {
					if ( bsp.every( x => !(x & b) ) ) continue;
				} else {
					if ( bsp.some( x => !(x & b) ) ) continue;
				}

				// If the match have already been instantiated, reuse it
				// (but only if branchlike interactions are allowed)
				if ( (this.opt.interactions & 4) && m.ev ) {
					m.ev.b |= b;
					continue;
				}
			} else {
				// Ignore matches that have already been instantiated
				if ( m.ev ) continue;
			}

			// Edges to add
			// If no duplicates set, do not add duplicates
			let add = this.mapper( m.rule.rhs, m.map );
			if ( this.opt.noduplicates ) {
				add = add.filter( (_,i) => !m.rule.rhsdup[i] );
			}

			// Rewrite
			m.ev = this.multiway.rewrite( m.hit, add, m.rule, this.step, b );

			this.eventcnt++;

			// Break when limit reached
			if ( this.eventcnt >= this.opt.maxevents ) break;

			yield;
		}

	}

	/**
	* Post-process matches by unwriting negs and updating leafs.
	* @generator
	*/
	*postProcessMatches() {

		// Finalize multiway system step
		let g = this.multiway.postProcess( this.opt.deduplicate );
		let vs = g.next();
		while( !vs.done ) {
			if ( vs.value ) {
				this.progress.merge = vs.value || "";
			}
			yield;
			vs = g.next();
		}

		// Post-process 'neg's
		if ( this.rulial.rules.some( x => x.hasOwnProperty("neg") ) ) {
			// Test for negs and remove overlapping matches
			const rm = [];
			const total = this.M.length;
			for( let idx = total-1; idx >= 0; idx-- ) {
				let m = this.M[idx];
				if ( m.ev && m.rule.neg && this.negs( m.rule, m.map, m.hit ) ) {
					rm.push( m );
				}
				this.progress.merge = "Negs ["+ Math.floor( (total - idx) / total * 100 ) + "%]";
				yield;
			}
			rm.forEach( m => {
				this.multiway.deleteEvent( m.ev );
				delete m.ev;
				this.eventcnt--;
			});
		}

		this.progress.merge = "";
	}

	/**
	* Rewrite.
	* @generator
	*/
	*rewrite() {

		let start = Date.now();
		do {
			// New step
			this.step++;
			this.progress.step = "" + this.step;

			// Find matches
			let g = this.findMatches();
			while ( !this.interrupt && !g.next().done ) {
				if ( (Date.now() - start) > this.opt.timeslot ) {
					this.progress.matches = "" + this.M.length;
					yield;
					start = Date.now();
				}
			}
			this.progress.matches = "" + this.M.length;

			// Break if no new hits
			if ( this.M.length === 0 ) break;


			// Pre-process multiway system
			this.multiway.preProcess();

			// Generator(s) to process
			let gs = [];
			for( let i=0; i< (this.opt.evolution || 4); i++ ) {
				gs.push( this.processMatches( 1 << i ) );
			}

			// Full multiway
			if ( this.opt.evolution === 0 ) {
				gs.push( this.processMatches( 0 ) );
			}

			// Process matches
			let oldeventcnt = this.eventcnt;
			let vs = gs.map( x => x.next() );
			while ( !this.interrupt && vs.some( x => !x.done ) ) {
				if ( (Date.now() - start) > this.opt.timeslot  ) {
					this.progress.events = "" + this.eventcnt;
					yield;
					start = Date.now();
				}
				vs = gs.map( x => x.next() );
			}
			this.progress.events = "" + this.eventcnt;

			// Post-process matches
			g = this.postProcessMatches();
			while ( !g.next().done ) {
				if ( (Date.now() - start) > this.opt.timeslot  ) {
					yield;
					start = Date.now();
				}
			}

			// Break if no new rewrites
			if ( this.eventcnt === oldeventcnt ) break;

		} while( !this.interrupt && this.eventcnt < this.opt.maxevents );
	}

	/**
	* Timer.
	* @param {Object} g Generator for rewrite
	*/
	timer(g) {
		if ( g.next().done ) {
			this.interrupt = false;
			if ( this.finishedfn ) {
				this.finishedfn();
			}
		} else {
			if ( this.progressfn ) {
				this.progress.progress = this.eventcnt / this.opt.maxevents;
				this.progressfn( this.progress );
			}
			this.timerid = setTimeout( this.timer.bind(this), this.rewritedelay, g );
		}
	}

	/**
	* Run abstract rewriting rules.
	* @param {Rules} rulestr Rewriting rules as a string
	* @param {Options} opt
	* @param {progressfn} [progressfn=null] Progress update callback function
	* @param {finishedfn} [finishedfn=null] Rewriting finished callback function
	*/
	run( rulestr, opt, progressfn = null, finishedfn = null ) {

		// Set parameters
		this.reset( opt );
		this.rulial.setRule( rulestr );
		this.progressfn = progressfn;
		this.finishedfn = finishedfn;

		// Add initial edges for all tracked branches
		let b = ( 1 << ( this.opt.evolution || 4 ) ) - 1;
		this.rulial.initial.forEach( init => {
			let ev =  this.multiway.rewrite( [], init.edges, null, ++this.step, init.b || b );
		});
		let f = this.multiway.postProcess( false ); // No de-duplication
		while ( !f.next().done );

		// Start rewriting process; timeout if either of the callback fns set
		let g = this.rewrite();
		if ( this.progressfn || this.finishedfn ) {
			this.timerid = setTimeout( this.timer.bind(this), this.rewritedelay, g );
		} else {
			while ( !g.next().done );
		}
	}

	/**
	* Cancel rewriting process.
	*/
	cancel() {
		this.progress.user = "Stopping...";
		this.interrupt = true;
	}

	/**
	* Report status.
	*/
	status() {
		return { ...this.multiway.status() };
	}

}


export { Rewriter };