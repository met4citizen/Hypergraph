import { SpatialGraph } from "./SpatialGraph.mjs";
import { CausalGraph } from "./CausalGraph.mjs";
import { AlgorithmicGraph } from "./AlgorithmicGraph.mjs";

/**
* @class Hypergraph Rewriting System.
* @author Mika Suominen
*/
class HypergraphRewritingSystem {

	/**
	* Rewriting rule.
	* @typedef {Hyperedge[]} RulePattern
	*/

	/**
	* Creates an instance of HypergraphRewritingSystem.
	* @constructor
	*/
	constructor() {
		this.spatial = new SpatialGraph(); // Spatial hypergraph
		this.causal = new CausalGraph(); // Causal graph
		this.algorithmic = new AlgorithmicGraph(); // Algorithmic graph

		this.step = -1;
		this.eventcnt = 0;
		this.maxevents = 0; // Maximum limit set for events length
		this.matches = []; // LHS hits as maps
		this.eventordering = ""; // Event ordering
		this.ruleordering = ""; // Rule ordering
		this.qm = false; // Simulate Quantum Mechanics
		this.progressfn = null; // Callback for rewrite progress
		this.finishedfn = null; // Callback for rewrite finished
		this.duration = 0; // Elapsed time processing the rules

		this.rewritedelay = 100; // Delay between rewrites in msec
	}

	/**
	* Clear instance.
	*/
	clear() {
		this.spatial.clear();
		this.causal.clear();
		this.algorithmic.clear();

		this.step = -1;
		this.eventcnt = 0;
		this.maxevents = 0; // Maximum limit set for events length
		this.matches = []; // LHS hits as maps
		this.eventordering = ""; // Event ordering
		this.ruleordering = ""; // Rule ordering
		this.qm = false; // Simulate Quantum Mechanics
		this.progressfn = null; // Callback for rewrite progress
		this.finishedfn = null; // Callback for rewrite finished
		this.duration = 0; // Elapsed time processing the rules

		this.rewritedelay = 100; // Delay between rewrites in msec
	}

	/**
	* Map subgraph pattern to real subgraph using 'map'.
	* @param {RulePattern} rulepatterns Patterns to map
	* @param {number[]} map Map from pattern to real vertices
	* @return {RulePattern} Real subgraph.
	*/
	mapper( patterns, map ) {
		return patterns.map( p => p.map( v => ( v < map.length ? map[v] : this.spatial.maxv + ( v - map.length ) + 1 ) ) );
	}

	/**
	* Test whether an edge matches the given pattern.
	* @param {Hyperedge} edge Hyperedge to test
	* @param {Hyperedge} p Pattern to test against
	* @return {Hyperedge} True if edge matches the pattern
	*/
	isMatch( edge, p ) {
		if ( edge.length !== p.length ) return false;
		for( let i=p.length-1; i>=0; i-- ) {
			let x = p.indexOf( p[i] );
			if ( x !== i && edge[x] !== edge[i] ) return false;
		}
		return true;
	}

	/**
	* Test whether neg pattern exists.
	* @param {number[][]} lhs LHS pattern
	* @param {number[][]} neg Neg pattern
	* @param {number[]} map
	* @return {boolean} True if neg exists.
	*/
	isNeg( lhs, neg, map ) {
		let maxnum = Math.max( ...lhs.flat() );
		let negMaxnum = Math.max( ...lhs.flat(), ...neg.flat() );
		let map0 =  [ ...map, ...new Array( negMaxnum - maxnum ).fill(-1) ];
		let mapsNext = [ map0 ];

		for( let j = 0; j < neg.length; j++ ) {
			let pattern = neg[j];
			let maps = mapsNext;
			mapsNext = [];

			// Iterate all mapping hypotheses
			for( let k = maps.length-1; k >= 0; k-- ) {
				let edges = this.spatial.find( this.mapper( [ pattern ], maps[k] )[0] );
				for (let l = edges.length-1; l >= 0; l-- ) {
					if ( !this.isMatch( edges[l], pattern ) ) continue;
					let map = maps[k];
					for(let n = pattern.length - 1; n >= 0; n-- ) map[ pattern[n] ] = edges[l][n];
					mapsNext.push( [ ...map ] );
				}
			}
		}

		let fullrule = [ ...lhs, ...neg ];
		for( let k = mapsNext.length-1; k >=0; k-- ) {
			let hits = this.spatial.hits( this.mapper( fullrule, mapsNext[k] ) );
			if ( hits.length ) return true;
		}

		return false;
	}

	/**
	* Find possible mappings between rule pattern 'lhs' and the hypergraph.
	*/
	findMatches() {
		this.matches.length = 0;

		// No rules, no matches
		if ( this.algorithmic.rules.length == 0 ) return;

		// Check each edge for hit
		for( let f of this.spatial.F.values() ) {
			let edge = this.spatial.E.get( f[0] );

			// Go through all the rules
			for( let i=0; i < this.algorithmic.rules.length; i++ ) {
				let rule = this.algorithmic.rules[i];

				// Next rule, if the current edge doesn't match the rule
				if ( !this.isMatch( edge, rule.lhs[0] ) ) continue;

				// Map based on this edge
				let maxnum = Math.max( ...rule.lhs.flat() );
				let map0 = new Array( maxnum + 1 ).fill( -1 );
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
						let edges = this.spatial.find( this.mapper( [ pattern ], maps[k] )[0] );
						for (let l = edges.length-1; l >= 0; l-- ) {
							if ( !this.isMatch( edges[l], pattern ) ) continue;
							let map = maps[k];
							for(let n = pattern.length - 1; n >= 0; n-- ) map[ pattern[n] ] = edges[l][n];
							mapsNext.push( [ ...map ] );
						}
					}
				}

				// Filter out hypotheses that match 'neg', for QM we do this later
				if ( rule.hasOwnProperty("neg") ) {
					mapsNext = mapsNext.filter( map => !this.isNeg( rule.lhs, rule.neg, map ) );
				}

				// Replicate according to the final results
				for( let k = mapsNext.length-1; k >= 0; k-- ) {
					let hits = this.spatial.hits( this.mapper( rule.lhs, mapsNext[k] ) );
					for( let l = hits.length-1; l >= 0; l-- ) {
						this.matches.push( { r: i, hit: hits[l], m: mapsNext[k] } );
					}
				}
			}
		}
	}

	/**
	* Process the given rewriting rule 'lhs' 'rhs' using the given
	* array of mappings 'maps'.
	*/
	processMatches() {

		// Remove overlapping parts from the rules for QM simulation
		let rulesNol = [];
		if ( this.qm ) {
			for( let i=0; i < this.algorithmic.rules.length; i++ ) {
				let rule = this.algorithmic.rules[i];
				let obj = {};
				obj["hitmask"] = rule.lhs.map( p => !rule.rhs.map(x => x.join(",") ).includes( p.join(",") ) )
				obj["lhs"] = rule.lhs.filter( (_,j) => obj["hitmask"][j] );
				obj["rhs"] = rule.rhs.filter( p => !rule.lhs.map(x => x.join(",") ).includes( p.join(",") ) );
				rulesNol[i] = obj;
			}
		}

		for( let i=0; i < this.matches.length; i++ ) {

			let match = this.matches[i];
			let rulefull = this.algorithmic.rules[ match.r ];
			let hitfull = match.hit;

			// If the hit still exists, rewrite it
			if ( hitfull.every( x => this.spatial.E.has( x ) ) ) {

				// In QM sim we test for neg
				if ( this.qm && rulefull.hasOwnProperty("neg") &&
							this.isNeg( rulefull.lhs, rulefull.neg, match.m ) ) continue;

				let rule = this.qm ? rulesNol[ match.r ] : rulefull;
				let hit = this.qm ? hitfull.filter( (x,j) => rule.hitmask[j] ) : hitfull;
				let lhs = this.mapper( rule.lhs, match.m );
				let rhs = this.mapper( rule.rhs, match.m );

				// Rewrite
				let add = this.spatial.rewrite( hit, rhs );
				this.causal.rewrite( hit, add, { lhs: lhs, rhs: rhs }, this.step );

				// Break when limit reached
				if ( ++this.eventcnt >= this.maxevents ) break;
			}

		}

	}

	/**
	* Timed rewriting process.
	*/
	rewrite = () => {
		let start = performance.now();

		do {
			// New step
			this.step++;

			// Find all hits, break if no hits
			this.findMatches();
			if ( this.matches.length === 0 ) break;

			// Shuffle matches
			for (let i = this.matches.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[this.matches[i], this.matches[j]] = [this.matches[j], this.matches[i]];
			}

			// Sort matches
			if ( this.eventordering === 'ascending' ) {
				// Sort based on causal events in ascending order
				this.matches.forEach( match => {
					match.order = match.hit.map( e => this.causal.L.get( e ).v ).sort();
				});
				this.matches.sort( (a,b) => {
					const len = Math.min( a.order.length, b.order.length );
					for(let i = 0; i < len; i++ ) {
						if ( a.order[i] !== b.order[i] ) return a.order[i] - b.order[i];
					}
					return a.order.length - b.order.length;
				});
			} else if ( this.eventordering === 'descending' ) {
				// Sort based on causal events in descending order
				this.matches.forEach( match => {
					match.order = match.hit.map( e => this.causal.L.get( e ).v ).sort().reverse();
				});
				this.matches.sort( (a,b) => {
					const len = Math.min( a.order.length, b.order.length );
					for(let i = 0; i < len; i++ ) {
						if ( a.order[i] !== b.order[i] ) return b.order[i] - a.order[i];
					}
					return b.order.length - a.order.length;
				});
			} else if ( this.eventordering === 'wolfram' ) {
				// Sort based on Wolfram model and its standard event ordering
				this.matches.forEach( match => {
					let events = match.hit.map( e => {
						let l = this.causal.L.get( e );
						return 1000 * l.v + l.idx;
					});
					match.ruleorder = Array.from( Array(events.length).keys() ).sort( (a,b) => events[a] - events[b] );
					match.eventorder = events.sort().reverse();
				});
				this.matches.sort( (a,b) => {
					const len = Math.min( a.eventorder.length, b.eventorder.length );
					for(let i = 0; i < len; i++ ) {
						if ( a.eventorder[i] !== b.eventorder[i] ) return a.eventorder[i] - b.eventorder[i];
					}
					for(let i = 0; i < len; i++ ) {
						if ( a.ruleorder[i] !== b.ruleorder[i] ) return a.ruleorder[i] - b.ruleorder[i];
					}
					return a.r - b.r;
				});
			}

			// Rule ordering
			if ( this.algorithmic.rules.length > 1 ) {
				if ( this.ruleordering === 'index' ) {
					this.matches.sort( (a,b) => a.r - b.r );
				} else if ( this.ruleordering === 'indexrev' ) {
					this.matches.sort( (a,b) => b.r - a.r );
				}
			}

			// Process matches by running events, break if 'maxevents' is reached
			this.processMatches();
			if ( this.eventcnt >= this.maxevents ) break;
		}
		while( (performance.now() - start) < 500 );

		let end = performance.now();
		this.duration += end - start; // msec

		// Notify progress to parent
		if ( this.progressfn ) this.progressfn( this.eventcnt );

		// Break when there were no more matches or the limit was reached
		if ( this.matches.length === 0 || this.eventcnt >= this.maxevents ) {
			this.matches.length = 0;
			if ( this.finishedfn ) this.finishedfn();
			return;
		}

		// Empty matches
		this.matches.length = 0;

		// Continue to run after a short delay
		setTimeout( this.rewrite, this.rewritedelay );

	}

	/**
	* Callback for rewriting progress update.
	* @callback progressfn
	* @param {numeric} eventcnt Number of events processed.
	*/

	/**
	* Callback for rewriting process finished.
	* @callback finishedfn
	*/

	/**
	* Run abstract rewriting rules.
	* @param {Rules} rulestr Rewriting rules as a string
	* @param {string} [ruleOrdering="mixed"] Rewriting rules
	* @param {string} [eventOrdering="random"] Rewriting rules
	* @param {booelan} [qm=false] Simulate quantum mechanics
	* @param {number} [maxevents=500] Rewriting rules
	* @param {progressfn} progressfn Progress update callback function
	* @param {finishedfn} finishedfn Rewriting finished callback function
	*/
	run( rulestr, ruleOrdering = "mixed", eventOrdering = "random", qm=false, maxevents = 500, progressfn = null, finishedfn = null ) {

		// Initialize system
		this.clear();

		// Set parameters
		this.algorithmic.setRule( rulestr );
		this.ruleordering = ruleOrdering;
		this.eventordering = eventOrdering;
		this.qm = Boolean(qm);
		this.maxevents = maxevents;
		this.progressfn = progressfn;
		this.finishedfn = finishedfn;

		// Add initial edges
		let add =  this.spatial.rewrite( [], this.algorithmic.initial );
		this.causal.rewrite( [], add, { lhs: [], rhs: this.algorithmic.initial }, ++this.step );

		// Start rewriting process
		setTimeout( this.rewrite, this.rewritedelay );

	}

	/**
	* Cancel rewriting process.
	*/
	cancel() {
		this.maxevents = 0;
	}

	/**
	* Report status.
	*/
	status() {
		return {};
		// return { secs: (this.duration / 1000).toLocaleString(undefined, { maximumFractionDigits: 1, minimumFractionDigits: 1 }) };
	}

}


export { HypergraphRewritingSystem };
