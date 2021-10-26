import { Rulial } from "./Rulial.mjs";
import { Rewriter } from "./Rewriter.mjs";
import { Graph3D } from "./Graph3D.mjs";
import { HDC } from "./HDC.mjs";
import { SpriteText } from "./SpriteText.mjs";

/**
* @class User interface for rewriter
* @author Mika Suominen
*/
class Simulator extends Rewriter {

	/**
	* Reference frame
	* @typedef {Object} RefFrame
	* @property {number} view Viewmode, 1 = space (default), 2 = time
	* @property {boolean} leaves If true, show only leaves of the multiway system
	* @property {number} branches Field for branches to show, 0 = all
	*/

	/**
	* Creates an instance of Simulator.
	* @param {Object} element DOM element of the canvas
	* @param {Object} status DOM element of the status
	* @constructor
	*/
	constructor(canvas,status) {
		super();
    this.G = new Graph3D(canvas);
		this.dom = status; // DOM element for status

		this.maxtokenid = -1; // Max token id shown in phase view

    this.pos = 0; // Event log position
		this.playpos = 0; // Play position
		this.playing = false; // Is play on?
		this.stopfn = null; // stop callback function

		// Observer's reference frame
		this.observer = {
			view: 1, // space view
			leaves: true, // show only leaves
			branches: 0 // show all branches
		};

		this.H = new Map(); // Highlights
		this.F = null; // Fields

		// Variables x and y
		this.x = 0;
		this.y = 0;
		this.G.FG
			.onNodeClick( Simulator.onNodeClick.bind(this) )
			.onNodeRightClick( Simulator.onNodeRightClick.bind(this) )
			.nodeThreeObjectExtend( true );
	}

	/**
	* Click on node, set x
	* @param {Object} n Node object
	* @param {Object} event Event object
	*/
	static onNodeClick( n, event) {
		this.x = n.id;
		this.G.FG.nodeThreeObject( Simulator.nodeThreeObject.bind(this) );
		this.refresh();
	}

	/**
	* Right click on node, set y
	* @param {Object} n Node object
	* @param {Object} event Event object
	*/
	static onNodeRightClick( n, event) {
		this.y = n.id;
		this.G.FG.nodeThreeObject( Simulator.nodeThreeObject.bind(this) );
		this.refresh();
	}

	/**
	* Display x and/or y.
	* @param {Object} n Node object
	*/
	static nodeThreeObject( n ) {
		if ( n.id === this.x ) {
			if ( n.id === this.y ) {
				n.big = true;
				return new SpriteText("x=y",26,"DarkSlateGray");
			} else {
				n.big = true;
				return new SpriteText("x",26,"DarkSlateGray");
			}
		} else if ( n.id === this.y ) {
			n.big = true;
			return new SpriteText("y",26,"DarkSlateGray");
		} else {
			n.big = false;
			return false;
		}
	}

	/**
	* Check rewriting rule by passing it to algorithmic parser.
	* @param {string} rulestr Rewriting rule in string format.
	* @return {string} Rewriting rule in standard string format.
	*/
	validateRule( rulestr ) {
		let r = new Rulial();
		r.setRule( rulestr );
		return r.getRule();
	}

	/**
	* Set observer's reference frame
	* @param {RefFrame} rf
	*/
	setRefFrame( rf ) {
		if ( rf.hasOwnProperty("view") ) {
			let initlen;
			switch( rf.view ) {
				case "time":
					this.observer.view = 2;
					initlen = 1;
					break;
				case "phase":
					this.observer.view = 3;
					initlen = this.rulial.initial.length;
					this.maxtokenid = -1;
					break;
				default: // space
					this.observer.view = 1;
					initlen = this.rulial.initial.length;
			}

			// Stop animation and set position to start
			this.stop();
			this.pos = 0;
			this.playpos = 0;

			// Reset graph
			this.G.reset( this.observer.view );

			// First additions
			this.tick( initlen );
		}

		if ( ( rf.hasOwnProperty("branches") && rf.branches !== this.observer.branches ) ||
	 			 ( rf.hasOwnProperty("leaves") && rf.leaves !== this.observer.leaves ) ) {
			let update = false;
			if ( rf.hasOwnProperty("branches") ) {
				this.observer.branches = rf.branches;
				update = true;
			}
			if ( rf.hasOwnProperty("leaves") ) {
				this.observer.leaves = rf.leaves;
				if ( this.observer.view === 1 ) update = true;
			}
			if ( update ) {
				switch( this.observer.view ) {
					case 1: // Space
						for( let i=0; i<this.pos; i++ ) {
							this.processSpatialEvent( this.multiway.EV[ i ] );
						}
						break;
					case 2: // Time
						// Rewind
						if ( this.observer.branches > 0 ) {
							let rm = [];
							for( let t of this.G.T.keys() ) {
								if ( t.mw.some( ev => !( ev.b & this.observer.branches ) ) ) rm.push( t );
							}
							rm.forEach( this.G.del, this.G );
						}

						// Forward
						for( let i = 0; i < this.pos; i++ ) {
							this.processCausalEvent( this.multiway.EV[ i ] );
						}
						break;
				}
			}
			this.refresh();
		}

	}

	/**
	* Refresh UI.
	*/
	refresh() {
		this.processField();
		this.processHighlights();
		if ( this.dom ) {
			let s = this.status();
			let str = "";
			Object.keys(s).forEach( k => {
				str += '<span class="label up">'+k+'</span><span class="label status">'+s[k]+'</span>';
			});
			this.dom.innerHTML = str;
		}
		this.G.refresh(); // Refresh graph
	}

	/**
	* Show of hide edges in spatial graph.
	* @param {Object} ev Event reference
	* @return {boolean} True, if some change was made
	*/
	processSpatialEvent( ev ) {
		const tokens = [ ...ev.child, ...ev.parent ];

		let change = false;
		let bfn = (a,x) => a | (x.id <= ev.id ? x.b :0);
		if ( this.observer.branches ) {
			tokens.forEach( t => {
				let b = t.parent.reduce( bfn, 0 );
				if ( this.observer.leaves ) {
					b &= ~t.child.reduce( bfn, 0 );
				}
				if ( b & this.observer.branches ) {
					if ( !this.G.T.has( t ) ) {
						this.G.add(t,1);
						change = true;
					}
				} else {
					if ( this.G.T.has( t ) ) {
						this.G.del(t);
						change = true;
					}
				}
			});
		} else {
			tokens.forEach( t => {
				if ( this.observer.leaves && t.child.some( x => x.id <= ev.id ) ) {
					if ( this.G.T.has( t ) ) {
						this.G.del(t);
						change = true;
					}
				} else {
					if ( !this.G.T.has( t ) ) {
						this.G.add(t,1);
						change = true;
					}
				}
			});
		}

		return change;
	}

	/**
	* Show of hide edges in causal graph.
	* @param {Object} ev Event reference
	* @return {boolean} True, if change was made
	*/
	processCausalEvent( ev ) {
		let change = false;
		if ( this.observer.branches && !( ev.b & this.observer.branches ) ) return change;
		if ( ev.parent.length === 0 ) {
			this.G.add( { mw: [ ev ], edge: [ ev.id ] }, 2 );
			change = true;
		} else {
			let pev = [ ...new Set( ev.parent.map( x => x.parent ).flat() ) ];
			pev.forEach( x => {
				if ( x.id < ev.id && ( !this.observer.branches || (x.b & this.observer.branches)) ) {
					this.G.add( { mw: [ x, ev ], edge: [ x.id, ev.id ] }, 2 );
					change = true;
				}
			});
		}
		return change;
	}

	/**
	* Show of hide edges in phase graph.
	* @param {Object} ev Event reference
	* @return {boolean} True, if change was made
	*/
	processPhaseEvent( ev ) {
		let change = false;
		ev.child.forEach( t => {
			if ( t.id > this.maxtokenid ) {
				if ( t.nn[0].t === null ) {
					this.G.add( { mw: [ t ], edge: [ t.id ], w: 1 }, 3 );
				} else {
					if ( t.nn[0].d < this.opt.phasecutoff ) {
						this.G.add( { mw: [ t.nn[0].t ], edge: [ t.nn[0].t.id ], w: 1 }, 3 );
					} else {
						this.G.add( { mw: [ t.nn[0].t, t ], edge: [ t.nn[0].t.id, t.id ], w: t.nn[0].d }, 3 );
						if ( t.nn[1].d < 2560 ) {
							this.G.add( { mw: [ t.nn[1].t, t ], edge: [ t.nn[1].t.id, t.id ], w: t.nn[1].d }, 3 );
						}
						if ( t.nn[2].d < 2560 ) {
							this.G.add( { mw: [ t.nn[2].t, t ], edge: [ t.nn[2].t.id, t.id ], w: t.nn[2].d }, 3 );
						}
					}
				}
				this.maxtokenid = t.id;
				change = true;
			}
		});
		return change;
	}

	/**
	* Process events.
	* @param {number} [steps=1] Number of steps to process
	* @return {boolean} True there are more events to process.
	*/
	tick( steps = 1 ) {
		while ( steps > 0 && this.pos < this.multiway.EV.length ) {
			let ev = this.multiway.EV[ this.pos ];
			let changed = false;
			switch( this.observer.view ) {
				case 1:
					changed = this.processSpatialEvent( ev );
					break;
				case 2:
					changed = this.processCausalEvent( ev );
					break;
				case 3:
					changed = this.processPhaseEvent( ev );
			}
			if ( changed ) {
				steps--;
				this.playpos++;
			}
			this.pos++;
		}
		this.refresh();

		return (this.pos < this.multiway.EV.length);
	}

	/**
	* Timed update process.
	*/
	update() {
		const steps = Math.min( 15, Math.ceil( ( this.playpos + 1 ) / 10) );
		if ( this.tick( steps ) ) {
			if ( this.playing ) setTimeout( this.update.bind(this), 250 );
		} else {
			this.stop();
			if ( this.stopfn ) this.stopfn();
		}
	}

	/**
	* Callback for animation end.
	* @callback stopcallbackfn
	*/

	/**
	* Play animation.
	* @param {stopcallbackfn} stopcallbackfn Animation stopped callback function
	*/
	play( stopcallbackfn = null ) {
		this.G.FG.enablePointerInteraction( false );
		this.stopfn = stopcallbackfn;
		this.playpos = 0;
		this.playing = true;
		this.update();
	}

	/**
	* Stop animation.
	*/
	stop() {
		this.playing = false;
		this.G.FG.enablePointerInteraction( true );
	}

	/**
	* Skip to the end of the animation.
	*/
	final() {
		this.stop();
		this.G.force(-1,10);
		this.tick( this.multiway.EV.length );
	}


	/**
  * Highlight nodes/edges.
	* @param {string} str Commands in string format
  * @param {number} style Style to use in highlighting.
	* @param {Object} element DOM element for text results.
  * @param {boolean} surface If true, fill hypersurfaces.
  * @param {boolean} background If false, show only highlighted nodes/edges.
  */
  setHighlight( str, style, element, surface = true, background = true ) {
		// Parse command string for rules and commands
		let [ rules, cmds ] = Rulial.parseCommands( str ).reduce( (a,b) => {
      if ( b.cmd === '' ) {
        let r = Rulial.parseRules( b.params );
				if ( r.length === 0 ) {
					r = Rulial.parseRules( [ b.params[0] + "->" + b.params[0] ] );
				}
        if ( r.length ) {
          a[0].push( ...r ); // rule
        }
      } else {
        a[1].push(b); // command
      }
      return a;
    }, [[],[]]);

		// Highlight object
		const o = {
			cmds: cmds,
			rules: rules,
			style: style,
			element: element,
			surface: surface,
			background: background
		};

		this.G.clearHighlight( style );
		let result = this.calculateHighlight( cmds, rules );
		this.G.setHighlight( result, style, surface, background );

		if ( element ) {
			element.textContent = '['+result.r.join("|")+']';
		}

		this.H.set( style, o );
	}

	/**
  * Process existing highlights.
  */
  processHighlights() {
		for( let h of this.H.values() ) {
			try {
				this.G.clearHighlight( h.style );
				let result = this.calculateHighlight( h.cmds, h.rules );
				this.G.setHighlight( result, h.style, h.surface, h.background );
				if ( h.element ) {
					h.element.textContent = '['+result.r.join("|")+']';
				}
			}
			catch(e) {
				if ( h.element ) {
					h.element.textContent = '[Error]';
				}
			}
		}
	}

	/**
	* Run commands given in string format.
	* @param {Object[]} cmds Commands
	* @param {Object[]} rules Patterns to highlight
	* @return {Object} Edges, vertices, points and results.
	*/
	calculateHighlight( cmds, rules ) {
		const v = [], e = [], p = [], r = [];

		if ( cmds ) {
			cmds.forEach( (c,i) => {
				let ps = c.params.map( x => {
					if ( x === 'x' ) return this.x;
					if ( x === 'y' ) return this.y;
					return x;
				});


				let ret;

				switch( c.cmd ) {
				case "geodesic": case "line": case "path":
					if ( ps.length < 2 ) throw new TypeError("Geodesic: Invalid number of parameters.");
					p.push( parseInt(ps[0]), parseInt(ps[1]) );
					ret = this.G.geodesic( parseInt(ps[0]), parseInt(ps[1]), ps.includes("dir"), ps.includes("rev"), ps.includes("all") ).flat();
					r.push( ret.length );
					e.push( ret );
					break;

				case "phase":
					if ( ps.length < 2 ) throw new TypeError("Phase: Invalid number of parameters.");
					let a = this.G.V.get( parseInt(ps[0]) );
					let b = this.G.V.get( parseInt(ps[1]) );
					if ( a && b ) {
						p.push( parseInt(ps[0]), parseInt(ps[1]) );
						r.push( HDC.d( a.bc,b.bc ) );
						ret = this.G.geodesic( parseInt(ps[0]), parseInt(ps[1]), ps.includes("dir"), ps.includes("rev"), ps.includes("all") ).flat();
						e.push( ret );
					}
					break;

				case "curv": case "curvature":
					if ( ps.length < 2 ) throw new TypeError("Curv: Invalid number of parameters.");
					p.push( parseInt(ps[0]), parseInt(ps[1]) );
					let curv = this.G.orc( parseInt(ps[0]), parseInt(ps[1]) );
					curv = curv.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 });
					r.push( curv );
					e.push( this.G.geodesic( parseInt(ps[0]), parseInt(ps[1]), ps.includes("dir"), ps.includes("rev"), ps.includes("all") ).flat() );
					v.push( this.G.nsphere( parseInt(ps[0]), 1 ) );
					v.push( this.G.nsphere( parseInt(ps[1]), 1 ) );
					break;

				case "dim": case "dimension":
					let origin = this.G.nodes[ Math.floor( this.G.nodes.length / 2 ) ].id;
					if ( ps.length ) origin = parseInt(ps[0]);
					let tree = this.G.tree( origin );
					let radius = Math.max(1,Math.floor( tree.length/4 ));
					if ( ps.length > 1 ) radius = parseInt(ps[1]);
					if ( (radius+3) < tree.length ) {
						let dfn = (rad) => (Math.log(tree.slice(0,rad+1).flat().length)/Math.log(rad));
						let rads = Array(4).fill().map((x,j) => j+radius);
						let dim = rads.reduce((a,x) => a+dfn(x),0) / rads.length;
						ret = this.G.nball( origin, radius+1 );
						p.push( origin );
						r.push( dim.toLocaleString(undefined, { maximumFractionDigits: 1, minimumFractionDigits: 1 }) );
						e.push( ret );
						v.push( [ ...new Set( ret.flat() ) ] );
					}
					break;

				case "nsphere": case "sphere":
					if ( ps.length < 2 ) throw new TypeError("Nsphere: Invalid number of parameters.");
					p.push( parseInt(ps[0]) );
					ret = this.G.nsphere( parseInt(ps[0]), parseInt(ps[1]), ps.includes("dir"), ps.includes("rev") );
					r.push( ret.length );
					v.push( ret );
					break;

				case "nball": case "ball": case "tree":
					if ( ps.length < 2 ) throw new TypeError("Nball: Invalid number of parameters.");
					p.push( parseInt(ps[0]) );
					ret = this.G.nball( parseInt(ps[0]), parseInt(ps[1]), ps.includes("dir"), ps.includes("rev") );
					r.push( ret.length );
					e.push( ret );
					v.push( [ ...new Set( ret.flat() ) ] );
					break;

				case "random": case "walk":
					if ( ps.length < 2 ) throw new TypeError("Random: Invalid number of parameters.");
					p.push( parseInt(ps[0]) );
					ret = this.G.random( parseInt(ps[0]), parseInt(ps[1]), ps.includes("dir"), ps.includes("rev") );
					r.push( ret.length );
					e.push( ret );
					break;

				case "worldline": case "timeline":
					if ( this.observer.view === 2 ) {
						if ( ps.length < 1 ) throw new TypeError("Worldline: Invalid number of parameters.");
						let maxv = this.G.nodes.length;
						ret = this.multiway.worldline( [ ...ps.map( x => parseInt(x) ) ] ).filter( e => {
							return (e[0] < maxv) && (e[1] < maxv);
						});
						r.push( ret.length );
						e.push( ret );
						if ( ret.length ) {
							p.push( ret[0][0], ret[ ret.length - 1][1] );
						}
					}
					break;

				case "lightcone":
					if ( this.observer.view === 2 ) {
						if ( ps.length < 2 ) throw new TypeError("Lightcone: Invalid number of parameters.");
						p.push( parseInt(ps[0]) );
						ret = this.G.lightcone( parseInt(ps[0]), parseInt(ps[1]) );
						r.push( ret["past"].length + ret["future"].length );
						e.push( [ ...ret["past"], ...ret["future"] ] );
						v.push( [ ...new Set( ret["past"].flat() ) ] );
						v.push( [ ...new Set( ret["future"].flat() ) ] );
					}
					break;

				case "surface": case "hypersurface":
					if ( ps.length < 2 ) throw new TypeError("Surface: Invalid number of parameters.");
					ret = this.G.surface( parseInt(ps[0]), parseInt(ps[1]) );
					r.push( ret.length );
					v.push( ret );
					break;

				default:
					throw new TypeError( "Unknown command: " + c.cmd );
				}

			});
		}

		// Rules
		if ( rules && rules.length>0 && this.observer.view === 1 ) {
			let rw = new Rewriter();
			rw.rulial.rules = rules; // Rules
			rw.multiway = this.G; // Multiway system to search from
			let g = rw.findMatches();
			while( !g.next().done ); // Find matches
			r.push( rw.M.length );
			for( let m of rw.M ) {
				let ls = m.hit.filter( (_,i) => m.rule.lhsdup[i] ).map( t => this.G.T.get(t).map( l => [l.source.id,l.target.id] ) ).flat();
				e.push( ls );
			}
		}

		return { e: e, v: v, p: p, r: r };

	}

	/**
	* Clear highlight of the given style.
	* @param {number} style
	*/
	clearHighlight( style ) {
		let o = this.H.get( style );
		if ( !o ) return;

		if ( o.element ) {
			o.element.textContent = '';
		}

		this.G.clearHighlight( style );

		this.H.delete( style );
	}

	/**
	* Set gradient colours based on fields
	* @param {string} str Fields separated with semicolon
	* @param {Object} element DOM element for text results.
	* @param {Object} opt Options
	*/
	setField( str, element, opt ) {
		opt = opt || {};

		// Parse command string
		let cmds = Rulial.parseCommands( str );

		// Field object
		this.F = {
			cmds: cmds,
			element: element,
			opt: opt
		};

		// Calculate & display
		this.G.clearField();
		let result = this.calculateField( cmds, opt );
		this.G.setField();

		// Display numeric results
		if ( element ) {
			element.textContent = '['+result.join("|")+']';
		}

	}

	/**
	* Set gradient colours based on fields
	* @param {string} cmds Fields separated with semicolon
	* @param {Object} opt Options
	* @return {string[]} Text results
	*/
	calculateField( cmds, opt ) {
		const grad = new Map();
		const results = [];

		cmds.forEach( (c,i) => {
			let tmp = new Map();
			let scaleZero = false;
			let digits = 1;
			let min, max;

			// Phase reference point
			let phaseref;
			let pndx = 0;
			if ( c.cmd === 'phase' && c.params[pndx] ) {
				let id;
				if ( c.params[pndx] === 'x' ) {
					id = this.x;
				} else if ( c.params[pndx] === 'y' ) {
					id = this.y;
				} else {
					id = parseInt( c.params[pndx] );
				}
				phaseref = this.G.V.get( id );
				pndx++;
			}

			// Limits
			let minp, minv;
			if ( c.params[pndx] ) {
				if ( c.params[pndx].slice(-1)==="%" ) {
					minp = parseFloat( c.params[pndx] ) / 100;
				} else {
					minv = parseFloat( c.params[pndx] );
					min = minv;
				}
				pndx++;
			}
			let maxp, maxv;
			if ( c.params[pndx] ) {
				if ( c.params[pndx].slice(-1)==="%" ) {
					maxp = parseFloat( c.params[pndx] ) / 100;
				} else {
					maxv = parseFloat( c.params[pndx] );
					max = maxv;
				}
			}

			// Function to set value
			let setfn = (e,val) => {
				if (e && (typeof minv === 'undefined' || val>=minv) &&
						(typeof maxv === 'undefined' || val<=maxv) ) tmp.set(e,val);
			};

			switch( c.cmd ) {
			case "created":
				for ( const [t,ls] of this.G.T.entries() ) {
					if ( ls.length ) {
						let val = this.G.links.indexOf(ls[0]);
						if ( val !== -1 ) setfn( t, val );
					}
				}
				break;

			case "branch":
				let bits = [...Array(this.opt.evolution || 4)].map( (_,i) => i );
				let nums = bits.map( x => Math.pow(2,x) );
				let posid = this.pos > 0 ? this.multiway.EV[ this.pos-1 ].id : 0;
				if ( this.observer.view === 1 ) {
					for ( const t of this.G.T.keys() ) {
						let b = t.parent.reduce( (a,x) => a | (x.id <= posid ? x.b : 0), 0);
						if ( b > 0 ) {
							let val = bits.filter( (x,i) => b & nums[i] );
							setfn( t, val.reduce( (a,x) => a+x, 0 )/val.length + 1 );
						}
					}
				} else if ( this.observer.view === 2 ) {
					for ( const t of this.G.T.keys() ) {
						let b = t.mw.reduce( (a,x) => a | x.b, 0 );
						if ( b > 0 ) {
							let val = bits.filter( (x,i) => b & nums[i] );
							setfn( t, val.reduce( (a,x) => a+x, 0 )/val.length + 1 );
						}
					}
				} else if ( this.observer.view === 3 ) {
					for ( const t of this.G.T.keys() ) {
						let b = t.mw[ t.mw.length - 1 ].parent.reduce( (a,x) => a | x.b, 0 );
						if ( b > 0 ) {
							let val = bits.filter( (x,i) => b & nums[i] );
							setfn( t, val.reduce( (a,x) => a+x, 0 )/val.length + 1 );
						}
					}
				}
				min = min || 1;
				max = max || this.opt.evolution || 4;
				break;

			case "degree":
				for ( const [t,ls] of this.G.T.entries() ) {
					if ( ls.length ) {
						let val = ls.reduce( (a,l) => a + l.source.source.length +
											l.source.target.length + l.target.source.length +
											l.target.target.length, 0 ) / 2;
						setfn( t, val );
					}
				}
				break;

			case "energy": case "mass": case "momentum":
				if ( this.observer.view === 1 ) {
					for ( const t of this.G.T.keys() ) {
						let evs = [ ...t.parent, ...t.child ].filter( x => x.rule );
						if ( evs.length ) setfn( t, evs.reduce( (a,x) => a + x.rule[c.cmd],0 ) / evs.length );
					}
				} else if ( this.observer.view === 2 ) {
					for ( const t of this.G.T.keys() ) {
						let ev = t.mw[ t.mw.length-1 ];
						if ( ev.rule ) setfn( t, ev.rule[c.cmd] );
					}
				} else if ( this.observer.view === 3 ) {
					for ( const t of this.G.T.keys() ) {
						let evs = [ ...t.mw[ t.mw.length-1 ].parent, ...t.mw[ t.mw.length-1 ].child ].filter( x => x.rule );
						if ( evs.length ) setfn( t, evs.reduce( (a,x) => a + x.rule[c.cmd],0 ) / evs.length );
					}
				}
				break;

			case "step":
				if ( this.observer.view === 1 ) {
					for ( const t of this.G.T.keys() ) {
						setfn( t, t.parent.reduce( (a,x) => a + x.step,0 ) / t.parent.length );
					}
				} else if ( this.observer.view === 2 ) {
					for ( const t of this.G.T.keys() ) {
						setfn( t, t.mw[ t.mw.length-1 ].step );
					}
				} else if ( this.observer.view === 3 ) {
					for ( const t of this.G.T.keys() ) {
						setfn( t, t.mw[ t.mw.length -1 ].parent.reduce( (a,x) => a + x.step,0 ) / t.mw[ t.mw.length -1 ].parent.length );
					}
				}
				break;

			case "pathcnt":
				if ( this.observer.view === 1 ) {
					for ( const t of this.G.T.keys() ) {
						setfn( t, t.pathcnt );
					}
				} else if ( this.observer.view === 2 || this.observer.view === 3 ) {
					for ( const t of this.G.T.keys() ) {
						setfn( t, t.mw[ t.mw.length-1 ].pathcnt );
					}
				}
				break;

			case "phase":
				if ( phaseref ) {
					if ( this.observer.view === 1 ) {
						for ( const t of this.G.T.keys() ) {
							setfn( t, HDC.d( t.bc, phaseref.bc ) );
						}
					} else if ( this.observer.view === 2 || this.observer.view === 3 ) {
						for ( const t of this.G.T.keys() ) {
							setfn( t, HDC.d( t.mw[ t.mw.length-1 ].bc, phaseref.bc ) );
						}
					}
				}
				break;

			case "probability":
				let sum = 0, s = [];
				if ( this.observer.view === 1 ) {
					for ( const t of this.G.T.keys() ) {
						sum += t.pathcnt;
					}
					for ( const t of this.G.T.keys() ) {
						setfn( t, t.pathcnt / sum );
					}
				} else if ( this.observer.view === 2 ) {
					for ( const t of this.G.T.keys() ) {
						let ev = t.mw[ t.mw.length-1 ];
						let pc = ev.pathcnt;
						s[ ev.step ] ? s[ ev.step ] += pc : s[ ev.step ] = pc;
					}
					for ( const t of this.G.T.keys() ) {
						let ev = t.mw[ t.mw.length-1 ];
						let pc = ev.pathcnt;
						setfn( t, pc / s[ ev.step ] );
					}
				} else if ( this.observer.view === 3 ) {
					for ( const t of this.G.T.keys() ) {
						sum += t.mw[ t.mw.length -1 ].pathcnt;
					}
					for ( const t of this.G.T.keys() ) {
						setfn( t, t.mw[ t.mw.length -1 ].pathcnt / sum );
					}
				}
				digits = 4;
				break;

			case "curvature":
				for ( const [t,ls] of this.G.T.entries() ) {
					if ( ls.length && ls[0].source !== ls[0].target ) {
						let orc = this.G.orc( ls[0].source.id, ls[0].target.id );
						if ( isNaN(orc) || !isFinite(orc) ) continue;
						setfn( t, orc );
					}
				}
				scaleZero = true;
				digits = 2;
				break;

			default:
				throw new TypeError( "Unknown command: " + c.cmd );
			}

			// Min, max and scaling factors
			min = min || Math.min( ...tmp.values() );
			max = max || Math.max( ...tmp.values() );
			let scaleNeg = 1, scalePos = 1;

			// Results
			results.push( [
				min.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: 0 }),
				max.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: 0 })
			].join("<") );

			if ( scaleZero ) {
				// Scale zero to midpoint
				let limit = Math.max( Math.abs(min), Math.abs(max) );
				if ( min < 0 ) scaleNeg = limit / Math.abs(min);
				if ( max > 0 ) scalePos = limit / Math.abs(max);
				min = -limit;
				max = limit;
			}

			// Normalize
			let delta = max - min;
			for ( const [key, value] of tmp.entries() ) {
				let v = (value > 0 ? scalePos : scaleNeg ) * value;
				let norm = ( (min===max) ? 0.5 : ( (v - min) / delta ) );

				// Limits
				if ( (minp && norm<minp) || (maxp && norm>maxp) ) continue;

				// Add to final
				if ( grad.has( key ) ) {
					grad.get( key ).push( norm );
				} else {
					grad.set( key, [ norm ] );
				}
			}

		});

		// Set gradient as a mean of the normalized value
		for (const [key, value] of grad.entries()) {
			let mean = value.reduce( (a,b) => a + b, 0 ) / value.length;
			this.G.T.get( key ).forEach( l => l.grad = mean );
		}

		// Calculate values for nodes
		this.G.nodes.forEach( n => {
			let links = [ ...n.source, ...n.target ];
			if ( links.every( l => l.hasOwnProperty("grad") ) ) {
				n.grad = links.reduce( (a,b) => a + b.grad, 0) / links.length;
			}
		});

		// Smooth
		if ( opt.smooth ) {
			for( const l of this.G.links ) {
				if ( l.hasOwnProperty("grad") && l.source.hasOwnProperty("grad") && l.target.hasOwnProperty("grad") ) {
					l.grad = ( 2 * l.grad + l.source.grad + l.target.grad ) / 4;
				}
			}
		}

		return results;
	}

	/**
  * Process existing highlights.
  */
  processField() {
		if ( !this.F ) return;

		try {
			this.G.clearField();
			let result = this.calculateField( this.F.cmds, this.F.opt );
			this.G.setField();

			if ( this.F.element ) {
				this.F.element.textContent = '['+result.join("|")+']';
			}
		}
		catch(e) {
			if ( this.F.element ) {
				this.F.element.textContent = '[Error]';
			}
		}
	}


	/**
	* Clear gradient
	*/
	clearField() {
		if ( this.F ) {
			if ( this.F.element ) {
				this.F.element.textContent = '';
			}
			delete this.F;
		}
		this.G.clearField();
	}

	/**
	* Report status.
	* @return {Object} Status of the Multiway3D.
	*/
	status() {
		return { ...this.G.status(), events: this.pos+"/"+this.multiway.EV.length };
	}

}

export { Simulator };
