import { Rulial } from "./Rulial.mjs";
import { Rewriter } from "./Rewriter.mjs";
import { Graph3D } from "./Graph3D.mjs";

/**
* @class User interface for rewriter
* @author Mika Suominen
*/
class Simulator extends Rewriter {

	/**
	* Creates an instance of Multiway3D.
	* @param {Object} element DOM element of the canvas
	* @constructor
	*/
	constructor(element) {
		super();
    this.G = new Graph3D(element);

    this.pos = 0; // Event log position
		this.playpos = 0; // Play position
		this.playing = false; // Is play on?
		this.stopfn = null; // stop callback function
		this.view = 1; // View by default, 1 = space (default), 2 = time
		this.filter = 1; // Branches to show, by default 1
		this.dom = null; // DOM element for status

		this.H = new Map(); // Highlights
		this.F = null; // Fields
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
	* Reset graph and set view.
	* @param {string} view Mode
	* @param {Object} dom DOM element for status
	*/
	resetView( view, dom ) {
		this.view = (view === "time" ? 2 : 1);
		this.dom = dom;

		// Stop animation and set position to start
		this.stop();
		this.pos = 0;
		this.playpos = 0;

		// Reset graph
		this.G.reset( this.view );

		// First additions
		this.tick( this.rulial.initial.length );
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
	* @return {boolean} True, if change was made
	*/
	processSpatialEvent( ev ) {
		let r = false;
		if ( (this.filter > 0) && !( ev.b & this.filter ) ) return r;
		let tokens = [ ...new Set( [ ...ev.child, ...ev.parent ] ) ];
		for( let t of tokens ) {
			if ( this.filter === -1 ) {
				if ( t.child.some( x => x.id <= ev.id ) ) {
					if ( this.G.T.has( t ) ) {
						this.G.del(t);
						r = true;
					}
				} else {
					if ( !this.G.T.has( t ) ) {
						this.G.add(t,false);
						r = true;
					}
				}
			} else if ( this.filter === 0 && t.parent.some( x => x.b === 0 ) ) {
				if ( !this.G.T.has( t ) ) {
					this.G.add(t,false);
					r = true;
				}
			} else {
				let b1 = t.parent.reduce( (a,x) => a | (x.id <= ev.id ? x.b :0), 0);
				let b2 = t.child.reduce( (a,x) => a | (x.id <= ev.id ? x.b :0), 0);
				let bs = b1 & ~b2;
				if ( bs && ( this.filter === 0 || bs & this.filter ) ) {
					if ( !this.G.T.has( t ) ) {
						this.G.add(t,false);
						r = true;
					}
				} else {
					if ( this.G.T.has( t ) ) {
						this.G.del(t);
						r = true;
					}
				}
			}
		}
		return r;
	}

	/**
	* Show of hide edges in causal graph.
	* @param {Object} ev Event reference
	* @return {boolean} True, if change was made
	*/
	processCausalEvent( ev ) {
		let r = false;
		if ( this.filter > 0 && !( ev.b & this.filter ) ) return r;
		if ( ev.parent.length === 0 ) {
			this.G.add( { ev: [ ev ], edge: [ ev.id ] }, true );
			r = true;
		} else {
			let pev = [ ...new Set( ev.parent.map( x => x.parent ).flat() ) ];
			pev.forEach( x => {
				if ( x.id < ev.id && (this.filter <= 0 || (x.b & this.filter)) ) {
					this.G.add( { ev: [ x, ev ], edge: [ x.id, ev.id ] }, true );
					r = true;
				}
			});
		}
		return r;
	}

	/**
	* Modify branches to show
	* @param {number} f Filter, bit field of branches to show, 0 = show all, -1 = all leafs
	*/
	showBranches( f ) {
		if ( f === this.filter ) return; // Same filter, do nothing

		let oldfilter = this.filter;
		this.filter = f;
		let posid = this.pos > 0 ? this.multiway.EV[ this.pos-1 ].id : 0;

		if ( this.view === 1 ) {
			// Rewind
			if ( this.filter === -1 ) {
				let rm = [];
				for( let t of this.G.T.keys() ) {
					if ( t.child.some( x => x.id < posid ) ) rm.push( t );
				}
				rm.forEach( this.G.del, this.G );
			} else if ( this.filter > 0 ) {
				let rm = [];
				for( let t of this.G.T.keys() ) {
					let b1 = t.parent.reduce( (a,x) => a | (x.id <= posid ? x.b :0), 0);
					let b2 = t.child.reduce( (a,x) => a | (x.id <= posid ? x.b :0), 0);
					if ( !( ( b1 & ~b2 ) & this.filter ) ) rm.push( t );
				}
				rm.forEach( this.G.del, this.G );
			}

			// Forward
			for( let i = 0; i < this.pos; i++ ) {
				let ev = this.multiway.EV[ i ];
				let tokens = [ ...new Set( [ ...ev.child, ...ev.parent ] ) ];
				for( let t of tokens ) {
					if ( this.filter === -1 ) {
						if ( t.child.every( x => x.id > posid ) ) {
							this.G.add(t,false);
						}
					} else if ( this.filter === 0 && t.parent.some( x => x.b === 0 ) ) {
						this.G.add(t,false);
					} else {
						let b1 = t.parent.reduce( (a,x) => a | (x.id <= posid ? x.b :0), 0);
						let b2 = t.child.reduce( (a,x) => a | (x.id <= posid ? x.b :0), 0);
						let bs = b1 & ~b2;
						if ( bs && ( this.filter === 0 || bs & this.filter ) ) {
							this.G.add(t,false)
						}
					}
				}
			}
		} else if ( this.view === 2 ) {
			// Rewind
			if ( this.filter > 0 ) {
				let rm = [];
				for( let t of this.G.T.keys() ) {
					if ( t.ev.some( ev => !( ev.b & this.filter ) ) ) rm.push( t );
				}
				rm.forEach( this.G.del, this.G );
			}

			// Forward
			for( let i = 0; i < this.pos; i++ ) {
				let ev = this.multiway.EV[ i ];
				this.processCausalEvent( ev );
			}
		}
		this.refresh();
	}

	/**
	* Process events.
	* @param {number} [steps=1] Number of steps to process
	* @return {boolean} True there are more events to process.
	*/
	tick( steps = 1 ) {
		while ( steps > 0 && this.pos < this.multiway.EV.length ) {
			let ev = this.multiway.EV[ this.pos ];
			let r = false;
			if ( this.view === 1 ) {
				r = this.processSpatialEvent( ev );
			} else if ( this.view === 2 ) {
				r = this.processCausalEvent( ev );
			}
			if ( r ) {
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
		if ( this.view === 1 ) {
			this.G.force(-1,10);
		} else {
			this.G.force(-1,10);
		}
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
				let ret;

				switch( c.cmd ) {
				case "geodesic": case "line": case "path":
					if ( c.params.length < 2 ) throw new TypeError("Geodesic: Invalid number of parameters.");
					p.push( parseInt(c.params[0]), parseInt(c.params[1]) );
					ret = this.G.geodesic( parseInt(c.params[0]), parseInt(c.params[1]), c.params.includes("dir"), c.params.includes("rev"), c.params.includes("all") ).flat();
					r.push( ret.length );
					e.push( ret );
					break;

				case "curv":
					if ( c.params.length < 2 ) throw new TypeError("Curv: Invalid number of parameters.");
					p.push( parseInt(c.params[0]), parseInt(c.params[1]) );
					let curv = this.G.orc( parseInt(c.params[0]), parseInt(c.params[1]) );
					curv = curv.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 });
					r.push( curv );
					e.push( this.G.geodesic( parseInt(c.params[0]), parseInt(c.params[1]), c.params.includes("dir"), c.params.includes("rev"), c.params.includes("all") ).flat() );
					v.push( this.G.nsphere( parseInt(c.params[0]), 1 ) );
					v.push( this.G.nsphere( parseInt(c.params[1]), 1 ) );
					break;

				case "nsphere": case "sphere":
					if ( c.params.length < 2 ) throw new TypeError("Nsphere: Invalid number of parameters.");
					p.push( parseInt(c.params[0]) );
					ret = this.G.nsphere( parseInt(c.params[0]), parseInt(c.params[1]), c.params.includes("dir"), c.params.includes("rev") );
					r.push( ret.length );
					v.push( ret );
					break;

				case "nball": case "ball": case "tree":
					if ( c.params.length < 2 ) throw new TypeError("Nball: Invalid number of parameters.");
					p.push( parseInt(c.params[0]) );
					ret = this.G.nball( parseInt(c.params[0]), parseInt(c.params[1]), c.params.includes("dir"), c.params.includes("rev") );
					r.push( ret.length );
					e.push( ret );
					v.push( [ ...new Set( ret.flat() ) ] );
					break;

				case "random": case "walk":
					if ( c.params.length < 2 ) throw new TypeError("Random: Invalid number of parameters.");
					p.push( parseInt(c.params[0]) );
					ret = this.G.random( parseInt(c.params[0]), parseInt(c.params[1]), c.params.includes("dir"), c.params.includes("rev") );
					r.push( ret.length );
					e.push( ret );
					break;

				case "worldline": case "timeline":
					if ( this.view === 2 ) {
						if ( c.params.length < 1 ) throw new TypeError("Worldline: Invalid number of parameters.");
						let maxv = this.G.nodes.length;
						ret = this.multiway.worldline( [ ...c.params.map( x => parseInt(x) ) ] ).filter( e => {
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
					if ( this.view === 2 ) {
						if ( c.params.length < 2 ) throw new TypeError("Lightcone: Invalid number of parameters.");
						p.push( parseInt(c.params[0]) );
						ret = this.G.lightcone( parseInt(c.params[0]), parseInt(c.params[1]) );
						r.push( ret["past"].length + ret["future"].length );
						e.push( [ ...ret["past"], ...ret["future"] ] );
						v.push( [ ...new Set( ret["past"].flat() ) ] );
						v.push( [ ...new Set( ret["future"].flat() ) ] );
					}
					break;

				case "surface": case "hypersurface":
					if ( c.params.length < 2 ) throw new TypeError("Surface: Invalid number of parameters.");
					ret = this.G.surface( parseInt(c.params[0]), parseInt(c.params[1]) );
					r.push( ret.length );
					v.push( ret );
					break;

				default:
					throw new TypeError( "Unknown command: " + c.cmd );
				}

			});
		}

		// Rules
		if ( rules && rules.length>0 && this.view === 1 ) {
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

			// Limits
			let minp, minv;
			if ( c.params[0] ) {
				if ( c.params[0].slice(-1)==="%" ) {
					minp = parseFloat( c.params[0] ) / 100;
				} else {
					minv = parseFloat( c.params[0] );
					min = minv;
				}
			}
			let maxp, maxv;
			if ( c.params[1] ) {
				if ( c.params[1].slice(-1)==="%" ) {
					maxp = parseFloat( c.params[1] ) / 100;
				} else {
					maxv = parseFloat( c.params[1] );
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
				for ( const t of this.G.T.keys() ) {
					let b;
					if ( this.view === 1 ) {
						let b1 = t.parent.reduce( (a,x) => a | (x.id <= posid ? x.b : 0), 0);
						let b2 = t.child.reduce( (a,x) => a | (x.id <= posid ? x.b : 0), 0);
						b = b1 & ~b2;
					} else if ( this.view === 2 ) {
						b = t.ev.reduce( (a,x) => a | x.b, 0 );
					}
					if ( b > 0 ) {
						let val = bits.filter( (x,i) => b & nums[i] );
						setfn( t, val.reduce( (a,b) => a+b, 0 )/val.length + 1 );
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
				for ( const t of this.G.T.keys() ) {
					if ( this.view === 1 ) {
						let evs = [ ...t.parent, ...t.child ].filter( x => x.rule );
						if ( evs.length ) setfn( t, evs.reduce( (a,x) => a + x.rule[c.cmd],0 ) / evs.length );
					} else if ( this.view === 2 ) {
						let ev = t.ev[ t.ev.length-1 ];
						if ( ev.rule ) setfn( t, ev.rule[c.cmd] );
					}
				}
				break;

			case "step":
				for ( const t of this.G.T.keys() ) {
					if ( this.view === 1 ) {
						setfn( t, t.parent.reduce( (a,x) => a + x.step,0 ) / t.parent.length );
					} else if ( this.view === 2 ) {
						let ev = t.ev[ t.ev.length-1 ];
						setfn( t, ev.step );
					}
				}
				break;

			case "pathcnt":
				for ( const t of this.G.T.keys() ) {
					if ( this.view === 1 ) {
						setfn( t, t.pathcnt );
					} else if ( this.view === 2 ) {
						let ev = t.ev[ t.ev.length-1 ];
						setfn( t, ev.pathcnt );
					}
				}
				break;

			case "probability":
				let sum = 0, s = [];
				for ( const t of this.G.T.keys() ) {
					if ( this.view === 1 ) {
						sum += t.pathcnt;
					} else if ( this.view === 2 ) {
						let ev = t.ev[ t.ev.length-1 ];
						let pc = ev.pathcnt;
						s[ ev.step ] ? s[ ev.step ] += pc : s[ ev.step ] = pc;
					}
				}
				for ( const t of this.G.T.keys() ) {
					if ( this.view === 1 ) {
						setfn( t, t.pathcnt / sum );
					} else if ( this.view === 2 ) {
						let ev = t.ev[ t.ev.length-1 ];
						let pc = ev.pathcnt;
						setfn( t, pc / s[ ev.step ] );
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
