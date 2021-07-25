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

		this.step = 0;
		this.eventcnt = 0;
		this.maxevents = 0; // Maximum limit set for events length
		this.matches = []; // LHS hits as maps
		this.eventordering = ""; // Event ordering
		this.ruleordering = ""; // Rule ordering
		this.progressfn = null; // Callback for rewrite progress
		this.finishedfn = null; // Callback for rewrite finished
		this.duration = 0; // Elapsed time processing the rules

		this.rewritedelay = 100; // Delay between rewrites in msec
	}

	/**
	* Map subgraph pattern to real subgraph using 'map'.
	* @param {Hypergraph} graph Hypergraph
	* @param {RulePattern} rulepatterns Patterns to map
	* @param {number[]} map Map from pattern to real vertices
	* @return {RulePattern} Real subgraph.
	*/
	mapper( graph, patterns, map ) {
		return patterns.map( p => p.map( v => ( v < map.length ? map[v] : graph.maxv + ( v - map.length ) + 1 ) ) );
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
	* Find possible mappings between rule pattern 'lhs' and the hypergraph.
	* @param {Hypergraph} graph Hypergraph
	*/
	findMatches( graph ) {
		this.matches.length = 0;

		// No rules, no matches
		if ( this.algorithmic.rules.length == 0 ) return;

		// Check each edge for hit
		for( let f of graph.F.values() ) {
			let edge = graph.E.get( f[0] );

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
						let edges = graph.find( this.mapper( graph, [ pattern ], maps[k] )[0] );
						for (let l = edges.length-1; l >= 0; l-- ) {
							if ( !this.isMatch( edges[l], pattern ) ) continue;
							let map = maps[k];
							for(let n = pattern.length - 1; n >= 0; n-- ) map[ pattern[n] ] = edges[l][n];
							mapsNext.push( [ ...map ] );
						}
					}
				}

				// Replicate according to the final results
				for( let k = mapsNext.length-1; k >= 0; k-- ) {
					let hits = graph.hits( this.mapper( graph, rule.lhs, mapsNext[k] ) );
					this.matches.push( ...new Array( hits.length ).fill().map( (x,h) => {
						return { r: i, hit: hits[h], m: mapsNext[k] };
					}) );
				}
			}
		}
	}

	/**
	* Process the given rewriting rule 'lhs' 'rhs' using the given
	* array of mappings 'maps'.
	* @param {Hypergraph} spatial Spatial hypergraph
	* @param {Hypergraph} causal Causal hypergraph
	*/
	processMatches( spatial, causal ) {

		for( let i=0; i < this.matches.length; i++ ) {

			// If the hit still exists, rewrite it
			let hit = this.matches[i].hit;
			if ( hit.every( x => spatial.E.has( x ) ) ) {

				let lhs = this.mapper( spatial, this.algorithmic.rules[ this.matches[i].r ].lhs, this.matches[i].m );
				let rhs = this.mapper( spatial, this.algorithmic.rules[ this.matches[i].r ].rhs, this.matches[i].m );

				let add = spatial.rewrite( hit, rhs );
				causal.rewrite( hit, add, { lhs: lhs, rhs: rhs }, this.step );

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
			this.findMatches( this.spatial );
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
			this.processMatches( this.spatial, this.causal );
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
	* @param {number} [maxevents=500] Rewriting rules
	* @param {progressfn} progressfn Progress update callback function
	* @param {finishedfn} finishedfn Rewriting finished callback function
	*/
	run( rulestr, ruleOrdering = "mixed", eventOrdering = "random", maxevents = 500, progressfn = null, finishedfn = null ) {

		// Initialize system
		this.spatial.clear();
		this.causal.clear();
		this.matches.length = 0;
		this.duration = 0;
		this.eventcnt = 0;
		this.step = -1;

		// Set parameters
		this.algorithmic.setRule( rulestr );
		this.ruleordering = ruleOrdering;
		this.eventordering = eventOrdering;
		this.maxevents = maxevents;
		this.progressfn = progressfn;
		this.finishedfn = finishedfn;

		// Add initial edges
		let addes =  this.spatial.rewrite( [], this.algorithmic.initial );
		this.causal.rewrite( [], addes, { lhs: [], rhs: this.algorithmic.initial }, ++this.step );

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
	* @return {Object} Status of the spatial graph.
	*/
	status() {
		return {};
		// return { secs: (this.duration / 1000).toLocaleString(undefined, { maximumFractionDigits: 1, minimumFractionDigits: 1 }) };
	}

}


export { HypergraphRewritingSystem };
