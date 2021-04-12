import { BufferGeometry, BufferAttribute, MeshBasicMaterial, Mesh, DoubleSide, Vector3 } from 'https://unpkg.com/three@0.127.0/build/three.module.js'
import { ConvexGeometry } from 'https://unpkg.com/three@0.127.0/examples/jsm/geometries/ConvexGeometry.js';
import { GLTFExporter } from 'https://unpkg.com/three@0.127.0/examples/jsm/exporters/GLTFExporter.js';

import { HypergraphRewritingSystem } from "./HypergraphRewritingSystem.mjs";
import { SpriteText } from "./SpriteText.mjs";

/**
* @class Uses ForceGraph3D to visualize hypergraph rewriting.
* @author Mika Suominen
*/
class Hypergraph3D extends HypergraphRewritingSystem {

	/**
	* Creates an instance of Hypergraph3D.
	* @constructor
	*/
	constructor() {
		super();
		this.graph3d = ForceGraph3D({ rendererConfig: { antialias: true, precision: "lowp" }});
		this.data = this.spatial; // Displayed graph
		this.pos = 0; // Event log position
		this.playpos = 0; // Play position
		this.updatetimer = null;
		this.stopfn = null; // stop callback function
		this.hypersurface = [ [], [], [] ]; // meshes, red, blue
	}

	/**
	* Make pairs of an array, used to break hyperedges into pairs of two.
	* @static
	* @param {number[]} arr Array of numbers
	* @return {number[][]} Array of pairs of numbers.
	*/
	static pairs( arr ) {
		const result = [];
		for ( let i = 0; i < (arr.length - 1); i++ ) result.push( [ arr[i], arr[i+1] ] );
		return result;
	}

	/**
	* Make ternaries of an array, used for triangulation. First point fixed.
	* @static
	* @param {number[]} arr Array of numbers
	* @return {number[][]} Array of ternaries of numbers.
	*/
	static triangulate( arr ) {
		const result = [];
		for ( let i = 0; i < (arr.length - 2); i++ ) result.push( [ arr[0], arr[i+1], arr[i+2] ] );
		return result;
	}

	/**
	* Check rewriting rule by passing it to algorithmic parser.
	* @param {string} rulestr Rewriting rule in string format.
	* @return {string} Rewriting rule in standard string format.
	*/
	validateRule( rulestr ) {
		this.algorithmic.setRule( rulestr );
		return this.algorithmic.getRule();
	}

	/**
	* Run commands given in string format.
	* @param {string} str Commands in string format
	* @return {Object} Edges, vertices, points and results.
	*/
	execute( str ) {
		// Change parenthesis types and remove extra ones
		str = str.toLowerCase()
		.replace( /\{|\[/g , "(" ).replace( /}|]/g , ")" )
		.replace( /(\()+/g , "(" ).replace( /(\))+/g , ")" )
		.replace( /(;)+/g , ";" ).replace( /;$/g ,"" );

		// Discard all unsupported characters
		str = str.replace( /[^-()a-z0-9,.;]+/g , "" );

		const cmds = str.split(";").map( c => [ ...c.split("(").map( p => [ ...p.replace( /[^-a-z0-9,.]+/g, "" ).split(",") ] ) ] );

		const v = [], e = [], p = [], r = [];
		cmds.forEach( (c,i) => {
			const func = c[0][0];
			const params = c[1];
			let ret;

			switch( func ) {
			case "geodesic": case "line": case "path":
				p.push( parseInt(params[0]), parseInt(params[1]) );
				ret = this.data.geodesic( parseInt(params[0]), parseInt(params[1]), params.includes("dir"), params.includes("rev"), params.includes("all") ).flat();
				r.push( ret.length );
				e.push( ret );
				break;

			case "nsphere": case "sphere":
				p.push( parseInt(params[0]) );
				ret = this.data.nsphere( parseInt(params[0]), parseInt(params[1]), params.includes("dir"), params.includes("rev") );
				r.push( ret.length );
				v.push( ret );
				break;

			case "nball": case "ball": case "tree":
				p.push( parseInt(params[0]) );
				ret = this.data.nball( parseInt(params[0]), parseInt(params[1]), params.includes("dir"), params.includes("rev") );
				r.push( ret.length );
				e.push( ret );
				v.push( [ ...new Set( ret.flat() ) ] );
				break;

			case "random": case "walk":
				p.push( parseInt(params[0]) );
				ret = this.data.random( parseInt(params[0]), parseInt(params[1]), params.includes("dir"), params.includes("rev") );
				r.push( ret.length );
				e.push( ret );
				break;

			case "worldline": case "timeline":
				if ( this.data !== this.causal ) throw new Error("Timeline only available in 'Time' mode.");
				ret = this.data.worldline( parseInt(params[0]) );
				r.push( ret.length );
				e.push( ret );
				if ( ret.length ) {
					p.push( ret[0][0], ret[ ret.length - 1][1] );
				}
				break;

			case "lightcone":
				p.push( parseInt(params[0]) );
				if ( this.data !== this.causal ) throw new Error("Lightcones only available in 'Time' mode.");
				ret = this.data.lightcone( parseInt(params[0]), parseInt(params[1]) );
				r.push( ret["past"].length + ret["future"].length );
				e.push( [ ...ret["past"], ...ret["future"] ] );
				v.push( [ ...new Set( ret["past"].flat() ) ] );
				v.push( [ ...new Set( ret["future"].flat() ) ] );
				break;

			case "space":
				if ( this.data !== this.spatial ) throw new Error("Space only available in 'Space' mode.");
				ret = this.data.space( parseInt(params[0]), parseInt(params[1]) );
				r.push( ret.length );
				v.push( ret );
				break;

			case "time":
				if ( this.data !== this.causal ) throw new Error("Time only available in 'Time' mode.");
				ret = this.data.time( parseInt(params[0]), parseInt(params[1]) );
				r.push( ret.length );
				v.push( ret );
				break;

			case "": // pattern matching
				if ( this.data !== this.spatial ) throw new Error("Pattern matching only available in 'Space' mode.");
				this.algorithmic.setRule( str.split(";")[i] + "->()" );
				this.findMatches( this.spatial );
				r.push( this.matches.length );
				for( let j=0; j < this.matches.length; j++ ) {
					const hit = this.mapper( this.spatial, this.algorithmic.rules[ this.matches[j].r ].lhs , this.matches[j].m );
					e.push( hit );
					v.push( [ ...new Set( hit.flat() ) ] );
				}
				break;

			case "-": case "^": // pattern matching, EXCLUDE
				if ( this.data !== this.spatial ) throw new Error("Pattern matching only available in 'Space' mode.");
				this.algorithmic.setRule( str.split(";")[i].substr(1) + "->()" );
				this.findMatches( this.spatial );
				r.push( this.matches.length );
				for( let j=0; j < this.matches.length; j++ ) {
					const hit = this.mapper( this.spatial, this.algorithmic.rules[ this.matches[j].r ].lhs , this.matches[j].m );
					const hitflat = [ ...new Set( hit.flat() ) ];

					// Remove from edges
					for( let m = hit.length-1; m >= 0; m-- ) {
						for( let k = e.length - 1; k >= 0; k--) {
							for( let l = e[k].length - 1; l >=0; l-- ) {
	 							if ( e[k][l].length === hit[m].length && e[k][l].every( (x,y) => x === hit[m][y] ) ) e[k].splice(l, 1);
							}
						}
					}

					// remove from vertices
					for( let k = v.length -1; k >= 0; k--) {
						for (let l = v[k].length - 1; l >= 0; l--) {
							if ( hitflat.includes( v[k][l] ) ) v[k].splice(l, 1);
						}
					}
				}
				break;

			default:
				throw new Error( "Unknown command: " + func );
			}

		});

		return { e: e, v: v, p: p, r: r };

	}

	/**
	* Update hyperedges.
	* @param {Object} linkObject Link
	* @param {Object} coordinates Start and end
	* @param {Object} link Link
	* @return {boolean} False.
	*/
	static linkPositionUpdate( linkObject, coordinates, link ) {
		if ( link.hasOwnProperty("hyperedge") && link.meshes.length > 0 ) {
			const pos = link.meshes[0].geometry.attributes.position;
			let i = 0;
			Hypergraph3D.triangulate( link.hyperedge ).forEach( t => {
				if ( t[0] !== t[1] && t[0] !== t[2] && t[1] !== t[2] ) {
					t.forEach( v => {
						pos.array[ i++ ] = v.x;
						pos.array[ i++ ] = v.y;
						pos.array[ i++ ] = v.z ? v.z : 0;
					});
				}
			});
			pos.needsUpdate = true;
		}
		return false;
	}

	/**
	* Setup 3d force directed graph.
	* @param {Object} element DOM element of the canvas
	* @param {Object} spatialStyles Styles for spatial graph
	* @param {Object} causalStyles Styles for causal graph
	*/
	setup( element, spatialStyles, causalStyles, algorithmicStyles ) {
		this.spatialStyles = spatialStyles;
		this.causalStyles = causalStyles;
		this.algorithmicStyles = algorithmicStyles;
		this.graph3d( element )
		.forceEngine('d3')
		.numDimensions( 3 )
		.showNavInfo( false )
		.enablePointerInteraction( true )
		.backgroundColor( this.spatialStyles[0]["bgColor"] )
		.nodeLabel( d => `<span class="nodeLabelGraph3d">${ d.id }</span>` )
		.nodeVisibility( 'refs' )
		.nodeOpacity( 0.9 )
		.linkOpacity( 0.9 )
		.cooldownTime( 5000 )
		.onEngineStop( () => { this.hypersurfaceUpdate(); } );

		// Set link strength
		this.graph3d.d3Force("link").strength( l => {
			let refs = 2 * (Math.min(l.source.refs, l.target.refs) + 1);
			return 1 / refs;
		});

		// Material for hyperedges
		if ( typeof this.hyperedgematerial !== 'undefined' ) {
			this.hyperedgematerial.dispose();
		}
		this.hyperedgematerial = new MeshBasicMaterial( {
			color: this.spatialStyles[4].fill,
			transparent: true,
			opacity: this.spatialStyles[4].opacity,
			side: DoubleSide,
			depthTest: false,
		 	depthWrite: false } );

	}

	/**
	* Update 3d force directed graph size.
	* @param {number} width New window width
	* @param {number} height New window height
	*/
	size( width, height ) {
		this.graph3d.width( width );
		this.graph3d.height( height );
	}

	/**
	* Add a hyperedge.
	* @param {Object} event Event with edges to add
	* @param {Object} nodes Nodes
	* @param {Object} links Links
	*/
	add( event, nodes, links ) {
		const { ["a"]: edge, ...props } = event;

		// Base location on existing nodes
		let k = { x: 0, y: 0, z: 0 }, i = 0;
		edge.forEach( n => {
			if (typeof nodes[n] !== 'undefined') {
				k.x += nodes[n].x;
				k.y += nodes[n].y;
				k.z += nodes[n].z;
				nodes[n].refs++; i++;
			}
		});
		if ( i ) {
			k.x = k.x / i;
			k.y = k.y / i;
			k.z = k.z / i;
		}

		// Causal mode (DAG)
		if ( this.data === this.causal ) {
			edge.forEach( n => {
				if (typeof nodes[n] === 'undefined') {
					nodes[n] = { id: n, refs: 1, style: 0, ...props,
						x: k.x + Math.sign(k.x) * 10 * Math.random(),
						y: k.y + Math.sign(k.y) * 10 * Math.random(),
						z: k.z + Math.sign(k.z) * 10 * Math.random() };
				}
			});
			// Add link
			links.push( {source: nodes[edge[0]], target: nodes[edge[1]], style: 0, ...props } );

		} else {
			// Spatial and algorithmic modes

			// Set new nodes near neighbours
			edge.forEach( n => {
				if (typeof nodes[n] === 'undefined') {
					nodes[n] = {id: n, refs: 1, style: 0, ...props,
						x: k.x + Math.random() - 0.5,
						y: k.y + Math.random() - 0.5,
						z: k.z + Math.sign(k.z) * Math.random() };
				}
			});

			// Add all edge pairs
			Hypergraph3D.pairs(edge).forEach( p => {
				let curv = 0.5;
				if (p[0] !== p[1]) {
					let idx = links.findIndex(l => l.source.id === p[0] && l.target.id === p[1] && !l.hasOwnProperty("hyperedge") );
					if (idx === -1) {
						// first link, keep straight
						curv = 0;
					} else {
						// existing link
						if (links[idx].curvature == 0) {
							// second link, switch values
							links[idx].curvature = 0.5;
							links[idx].rotations = 2 * Math.PI * Math.random();
							curv = 0;
						}
					}
				}

				// Add link
				links.push( {source: nodes[p[0]], target: nodes[p[1]], style: 0, curvature: curv,
					rotation: (curv === 0 ? 0 : 2 * Math.PI * Math.random()), ...props });

			});

			// If hyperedge, fill with triangles and connect the two ends for force effect
			if ( edge.length > 2 ) {
				const hyperedge = edge.map( n => nodes[ n ] );

				// Triangulate
				const coordinates = [];
				Hypergraph3D.triangulate( hyperedge ).forEach( t => {
					if ( t[0] !== t[1] && t[0] !== t[2] && t[1] !== t[2] ) {
						t.forEach( v => coordinates.push( v.x, v.y, v.z ? v.z : 0 ) );
					} else {
						// TODO: duplicates i.e. self-loops -> circles?
					}
				});

				if ( coordinates.length > 0 ) {
					const geom = new BufferGeometry();
					const positions = new Float32Array( coordinates );
					const normals = new Float32Array( coordinates.length );
					geom.setAttribute( 'position', new BufferAttribute( positions, 3 ) );
					geom.setAttribute( 'normal', new BufferAttribute( normals, 3 ) );
					geom.computeVertexNormals();

					const mesh = new Mesh(geom, this.hyperedgematerial );
					this.graph3d.scene().add( mesh);

					// Hyperlink
					links.push( {
						source: nodes[ edge[ edge.length-1 ] ],
						target: nodes[ edge[0] ],
						hyperedge: hyperedge,
						meshes: [ mesh ],
						style: 4, curvature: 0, rotation: 0, ...props } );

				}

			}

		}
	}

	/**
	* Remove a hyperedge.
	* @param {Object} event Event with edges to remove
	* @param {Object} nodes Nodes
	* @param {Object} links Links
	*/
	remove( event, nodes, links ) {
		// Remove by decreasing the reference number; nodes with ref 0 get hidden
		const { ["x"]: edge, ...props } = event;

		edge.forEach( n => nodes[n].refs-- );

		// Remove the first link
		Hypergraph3D.pairs( edge ).forEach( p => {
			let idx = links.findIndex(l => l.source.id === p[0] && l.target.id === p[1] && !l.hasOwnProperty("hyperedge"));
			if ( idx !== -1 ) links.splice( idx, 1 );
		});

		// Remove hyperedge
		let idx = links.findIndex( l => l.hasOwnProperty("hyperedge") && l.hyperedge.length === edge.length && l.hyperedge.every( (x,i) => x.id === edge[i] ) );
		if ( idx !== -1 ) {
			// Remove filled hyperedges
			links[ idx ].meshes.forEach( mesh => {
				this.graph3d.scene().remove( mesh );
				mesh.geometry.dispose();
				mesh = undefined;
			});
			// Remove link
			links.splice( idx, 1 );
		}

	}

	/**
	* Test whether array of numbers has duplicate values.
	*
	* @param {numbers[]} edge Array of vertices
	* @return {boolean} True if array has duplicates.
	*/
	reset( mode = "spatial" ) {
		// Stop animation and set position to start
		this.stop();
		this.pos = 0;
		this.playpos = 0;

		// Remove hypersurfaces
		this.hypersurface[1].length = 0;
		this.hypersurface[2].length = 0;
		this.hypersurfaceUpdate();

		// Remove hyperedges; empty nodes and links
		let { nodes, links } = this.graph3d.graphData();
		links.forEach( l => {
			if ( l.hasOwnProperty("hyperedge") ) {
				l.meshes.forEach( mesh => {
					this.graph3d.scene().remove( mesh );
					mesh.geometry.dispose();
					mesh = undefined;
				});
			}
		});
		nodes = [ { id: 0, refs: 0, style: 0, x: Math.random() - 0.5, y: Math.random() - 0.5, z: Math.random() - 0.5 } ];
		links = [];
		this.graph3d.graphData({ nodes, links });

		// Initialize the correct graph type
		switch( mode ) {
		case "spatial":
			this.data = this.spatial;
			this.graph3d
			.numDimensions( 3 )
			.dagMode( null )
			.backgroundColor( this.spatialStyles[0]["bgColor"] )
			.nodeLabel( d => `<span class="nodeLabelGraph3d">${ d.id }</span>` )
			.nodeRelSize( this.spatialStyles[0]["nRelSize"] )
			.nodeVal( d => (d.big ? 10 : 1 ) * this.spatialStyles[d.style]["nVal"]  )
			.nodeColor( d => this.spatialStyles[d.style]["nColor"] )
			.nodeVisibility( 'refs' )
			.linkVisibility( true )
			.linkWidth( d => this.spatialStyles[d.style]["lWidth"] )
			.linkColor( d => this.spatialStyles[d.style]["lColor"] )
			.linkPositionUpdate( Hypergraph3D.linkPositionUpdate )
			.linkCurvature( 'curvature' )
			.linkCurveRotation( 'rotation' )
			.linkDirectionalArrowLength(0)
			.d3VelocityDecay( 0.4 )
			.nodeThreeObject( null );
			// Set forces
			this.graph3d.d3Force("link").iterations( 2 );
			this.graph3d.d3Force("center").strength( 1 );
			this.graph3d.d3Force("charge").strength( -60 ).distanceMin( 2 );
			// First additions
			while( this.pos < this.algorithmic.initial.length && this.tick() );
			this.graph3d.cameraPosition( { x: 0, y: 0, z: 500 }, { x: 0, y: 0, z: 0 } );
			break;

		case "causal":
			this.data = this.causal;
			this.graph3d
			.numDimensions( 3 )
			.dagMode( "zout" )
			.backgroundColor( this.causalStyles[0]["bgColor"] )
			.nodeLabel( d => `<span class="nodeLabelGraph3d">${this.causal.vertexLabel( d.id )}</span>` )
			.nodeRelSize( this.causalStyles[0]["nRelSize"] )
			.nodeVal( d => (d.big ? 10 : 1 ) * this.causalStyles[d.style]["nVal"] )
			.nodeColor( d => this.causalStyles[d.style]["nColor"] )
			.nodeVisibility( 'refs' )
			.linkVisibility( true )
			.linkWidth( d => this.causalStyles[d.style]["lWidth"] )
			.linkColor( d => this.causalStyles[d.style]["lColor"] )
			.linkPositionUpdate( null )
			.linkCurvature( null )
			.linkCurveRotation( null )
			.linkDirectionalArrowLength(15)
			.linkDirectionalArrowRelPos(1)
			.d3VelocityDecay( 0.4 )
			.nodeThreeObject( null );
			// Set forces
			this.graph3d.d3Force("link").iterations( 1 );
			this.graph3d.d3Force("center").strength( 0.1 );
			this.graph3d.d3Force("charge").strength( -200 ).distanceMin( 1 );
			// First additions
			while( this.pos < 10 && this.tick() );
			this.graph3d.cameraPosition( { x: 0, y: 0, z: 500 }, { x: 0, y: 0, z: 0 } );
			break;

		case "algorithmic":
			this.data = this.algorithmic;
			this.graph3d
			.numDimensions( 3 )
			.dagMode( null )
			.backgroundColor( this.algorithmicStyles[0]["bgColor"] )
			.nodeLabel( d => `<span class="nodeLabelGraph3d">${ d.id }</span>` )
			.nodeRelSize( this.algorithmicStyles[0]["nRelSize"] )
			.nodeVal( d => (d.big ? 10 : 3 * d.refs ) * this.algorithmicStyles[d.style]["nVal"] )
			.nodeColor( d => this.algorithmicStyles[d.style]["nColor"] )
			.nodeVisibility( 'refs' )
			.linkVisibility( true )
			.linkWidth( d => this.algorithmicStyles[d.style]["lWidth"] )
			.linkColor( d => this.algorithmicStyles[d.style]["lColor"] )
			.linkPositionUpdate( Hypergraph3D.linkPositionUpdate )
			.linkCurvature( null )
			.linkCurveRotation( null )
			.linkDirectionalArrowLength(0)
			.linkDirectionalArrowRelPos(1)
			.d3VelocityDecay( 0.1 )
			.nodeThreeObject( n => {
				const text = this.algorithmic.vertexLabel( n.id );
				if ( !text ) return false;
				const sprite = new SpriteText( text, 16, "black" );
				sprite.material.depthWrite = false; // make sprite background transparent
				return sprite;
      })
			.nodeThreeObjectExtend( false );
			// Set forces
			this.graph3d.d3Force("link").iterations( 1 );
			this.graph3d.d3Force("center").strength( 0.5 );
			this.graph3d.d3Force("charge").strength( -30 ).distanceMin( 1 );
			// Rewrite and reveal all
			this.algorithmic.rewrite();
			while( this.tick() );
			this.graph3d.cameraPosition( { x: 0, y: 0, z: 1100 }, { x: 0, y: 0, z: 0 } );
			break;

		default:
			throw new Error( "Unknown mode: " + mode );
		}

	}

	/**
	* Process events.
	* @param {number} [steps=1] Number of steps to process
	* @param {boolean} [final=false] If true, skip to the end
	* @return {boolean} True there are more events to process.
	*/
	tick( steps = 1, final = false ) {
		let { nodes, links } = this.graph3d.graphData();
		for( let i = steps; i > 0; i-- ) {
			if ( this.pos >= this.data.events.length ) {
				this.graph3d.graphData( { nodes, links } );
				return false;
			}
			if ( this.data.events[ this.pos ].hasOwnProperty('a') ) {
				this.add( this.data.events[ this.pos ], nodes, links, final );
			} else if ( this.data.events[ this.pos ].hasOwnProperty('x') ) {
				this.remove( this.data.events[ this.pos ], nodes, links );
			}
			this.pos++;
			this.playpos++;
		}
		this.graph3d.graphData( { nodes, links } );
		return true;
	}

	/**
	* Timed update process.
	*/
	update = () => {
		const steps = Math.min( 50, Math.ceil( ( this.playpos + 1 ) / 10) );
		if ( !this.tick( steps ) ) {
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
	* @param {number} msec Timed interval in msecs
	* @param {stopcallbackfn} stopcallbackfn Animation stopped callback function
	*/
	play( msec, stopcallbackfn = null ) {
		this.graph3d.enablePointerInteraction( false );
		if ( this.updatetimer ) clearInterval( this.updatetimer );
		this.stopfn = stopcallbackfn;
		this.playpos = 0;
		this.updatetimer = setInterval( this.update, msec );
	}

	/**
	* Set/change animation speed.
	* @param {number} msec Timed interval in msecs
	*/
	speed( msec ) {
		if ( this.updatetimer ) {
			clearInterval( this.updatetimer );
			this.updatetimer = setInterval( this.update, msec );
		}
	}

	/**
	* Stop animation.
	*/
	stop() {
		if ( this.updatetimer ) {
			clearInterval( this.updatetimer );
			this.updatetimer = null;
		}
		this.graph3d.enablePointerInteraction( true );
	}

	/**
	* Skip to the end of the animation.
	*/
	final() {
		this.stop();
		// More iterations for spatial graph
		if ( this.data === this.spatial ) {
			this.graph3d.d3Force("link").iterations( 8 );
		}
		this.tick( this.data.events.length );
	}

	/**
	* Update hypersurfaces
	*/
	hypersurfaceUpdate() {
		let { nodes, links } = this.graph3d.graphData();
		this.hypersurface.forEach( (h,i) => {
			if ( i === 0 ) {
				// Remove hypersurces
				h.forEach( m => {
					this.graph3d.scene().remove( m );
					m.geometry.dispose();
					m.material.dispose();
					m = undefined;
				});
				h.length = 0;
			} else {
				h.forEach( vs => {
					const points = [];
					vs.forEach( v => {
						if ( typeof nodes[v] !== 'undefined' ) {
							points.push( new Vector3( nodes[v].x, nodes[v].y, nodes[v].z ? nodes[v].z : 0 ) );
						}
					});
					const geom = new ConvexGeometry( points );
					const mat = new MeshBasicMaterial( {
						color: this.spatialStyles[i].fill,
						transparent: true,
						opacity: this.spatialStyles[i].opacity,
						side: DoubleSide,
						depthTest: false,
					 	depthWrite: false } );
					const mesh = new Mesh(geom, mat);
					this.hypersurface[0].push( mesh );
					this.graph3d.scene().add( mesh );
				});
			}
		});

	}

	/**
	* Highlight nodes/edges.
	* @param {Object} subgraph Edges, nodes and points to highlight.
	* @param {number} style Style to use in highlighting.
	* @param {boolean} surface If true, fill hypersurfaces.
	* @param {boolean} background If false, show only highlighted nodes/edges.
	*/
	setHighlight( subgraph, style, surface = true, background = true ) {
		let { nodes, links } = this.graph3d.graphData();

		// Big Vertices
		subgraph['p'].forEach( n => {
			if ( typeof nodes[n] !== 'undefined' ) {
				nodes[n].big = true;
				nodes[n].style = nodes[n].style | style;
			}
		});

		// Vertices and hypersurfaces connecting them
		subgraph['v'].forEach( v => {
			v.forEach( n => {
				if ( typeof nodes[n] !== 'undefined' ) nodes[n].style = nodes[n].style | style;
			});
			if ( surface && v.length > 3 ) {
				this.hypersurface[ style ].push( v );
				this.hypersurfaceUpdate();
			}
		});

		// Hyperedges
		subgraph['e'].forEach(es => {
			es.forEach( e => {
				Hypergraph3D.pairs(e).forEach( p => {
					let idx = links.findIndex(l => l.source.id === p[0] && l.target.id === p[1] && !l.hasOwnProperty("hyperedge") );
					if (idx !== -1) links[ idx ].style = links[ idx ].style | style;
				});
			});
			const vertices = [ ...new Set( es.flat() ) ];
			vertices.forEach( n => {
				if ( typeof nodes[n] !== 'undefined' ) nodes[n].style = nodes[n].style | style;
			});
		});

		// Show/hide background graph and update
		if ( background ) {
			this.graph3d.nodeVisibility( 'refs' ).linkVisibility( true );
		} else {
			this.graph3d.nodeVisibility( d => d.refs && d.style ).linkVisibility( d => d.style );
		}

	}

	/**
	* Clear highlight style.
	* @param {number} style Style to be removed.
	*/
	clearHighlight( style ) {
		let { nodes, links } = this.graph3d.graphData();
		nodes.forEach( n => n.style = n.style & ~style );
		links.forEach( l => l.style = l.style & ~style );
		this.hypersurface[style].length = 0;
		this.hypersurfaceUpdate();
		this.graph3d.nodeVisibility( 'refs' ).linkVisibility( true );
	}

	/**
	* Start downloading a file.
	* @param {Object} content Content
	* @param {string} fileName Filename
	* @param {string} contentType Content type
	*/
	static download(content, fileName, contentType) {
		const a = document.createElement("a");
		const file = new Blob([content], { type: contentType });
		a.href = URL.createObjectURL(file);
		a.download = fileName;
		a.click();
	}

	/**
	* Export 3D model in GLB/GLTF format.
	* @param {boolean} binary If TRUE use BLB format, otherwise use GLTF.
	*/
	export( binary = true ) {
		// Instantiate a exporter
		const exporter = new GLTFExporter();
		const options = { onlyVisible: true, binary: binary };

		exporter.parse( this.graph3d.scene(), function (result) {
			if ( binary ) {
				Hypergraph3D.download( result, 'hypergraph.glb', "octet/stream" );
			} else {
				var output = JSON.stringify(result, null, 2);
				Hypergraph3D.download( output, 'hypergraph.gltf', 'application/json');
			}
		}, options);

	}

	/**
	* Report status.
	* @return {Object} Status of the Hypergraph3D.
	*/
	status() {
		return { ...this.data.status(), ...super.status() };
	}

}

export { Hypergraph3D };
