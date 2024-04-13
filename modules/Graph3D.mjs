import {
	BufferGeometry, BufferAttribute, Sprite, SpriteMaterial, Texture,
	MeshBasicMaterial, Mesh, DoubleSide, Vector3
} from 'three'
import { ConvexGeometry } from './ConvexGeometry.mjs';

import _3dForceGraph from 'forcegraph';
import { Graph } from "./Graph.mjs";

/**
* @class Graph3D
* @author Mika Suominen
*/
class Graph3D extends Graph {

	/**
	* Creates an instance of Hypergraph.
	* @param {Object} canvas DOM element of the canvas
	* @constructor
	*/
	constructor( element ) {
    super();
		this.element = element;
		this.FG = _3dForceGraph({ rendererConfig: { antialias: true, precision: "lowp" }});
		this.HS = []; // Array of highlighted hypersurfaces
		this.HL = []; // Array of extra highlighted link objs
		this.view = 1; // View, 1 = space, 2 = time

		this.spaceStyles = [
		  {  nColor: "black", lColor: "grey", nVal: 4, lWidth: 3, bgColor: "white", nRelSize: 3 }, // 0 defaults
		  {  nColor: "purple", lColor: "hotpink", nVal: 7, lWidth: 6, fill: "hotpink", opacity: 0.2 }, // 1 Red
		  {  nColor: "blue", lColor: "deepskyblue", nVal: 7, lWidth: 6, fill: "deepskyblue", opacity: 0.2 }, // 2 Blue
		  {  nColor: "darkblue", lColor: "darkblue", nVal: 7, lWidth: 6 }, // 3 Red + Blue
		  {  nColor: "lightgrey", lColor: "lightgrey", fill: "#A0D0D6", opacity: 0.3, nVal: 4, lWidth: 0, ring: "#000000", ringOpacity: 0.6 } // 4 Multiedge
		];

		this.timeStyles = [
		  {  nColor: "black", lColor: "grey", nVal: 6, lWidth: 6, bgColor: "white", nRelSize: 4 }, // 0 defaults
		  {  nColor: "purple", lColor: "hotpink", nVal: 8, lWidth: 9, fill: "hotpink", opacity: 0.2 }, // 1 Red
		  {  nColor: "blue", lColor: "deepskyblue", nVal: 8, lWidth: 9, fill: "deepskyblue", opacity: 0.2 }, // 2 Blue
		  {  nColor: "darkblue", lColor: "darkblue", nVal: 8, lWidth: 9 } // 3 Red + Blue
		];

		this.phaseStyles = [
		  {  nColor: "black", lColor: "grey", nVal: 4, lWidth: 3, bgColor: "white", nRelSize: 5 }, // 0 defaults
		  {  nColor: "purple", lColor: "hotpink", nVal: 7, lWidth: 6, fill: "hotpink", opacity: 0.2 }, // 1 Red
		  {  nColor: "blue", lColor: "deepskyblue", nVal: 7, lWidth: 6, fill: "deepskyblue", opacity: 0.2 }, // 2 Blue
		  {  nColor: "darkblue", lColor: "darkblue", nVal: 7, lWidth: 6 } // 3 Red + Blue
		];

		// Material for hyperedges
		this.hyperedgematerial = new MeshBasicMaterial( {
			color: this.spaceStyles[4].fill,
			transparent: true,
			opacity: this.spaceStyles[4].opacity,
			side: DoubleSide,
			depthTest: false,
			depthWrite: false
		});

		// Circle for unary edges
    let canvas = document.createElement( 'canvas' );
    canvas.width = 256;
    canvas.height = 256;
    let ctx = canvas.getContext( '2d' );
		ctx.lineWidth = 26;
		ctx.strokeStyle = "#ffffff";
		ctx.beginPath();
		ctx.arc( 128, 128, 96, 0, 2 * Math.PI, true );
		ctx.closePath();
		ctx.stroke();
    let texture = new Texture( canvas );
		texture.needsUpdate = true;
		this.circlematerial = new SpriteMaterial({
			opacity: this.spaceStyles[4].ringOpacity,
			map: texture,
			color: 0xffffff,
			transparent: true,
			depthTest: false,
			depthWrite: false
		});

		// Setup force graph
		this.FG( element )
	    .forceEngine('d3')
	    .numDimensions( 3 )
	    .showNavInfo( false )
	    .enablePointerInteraction( true )
	    .backgroundColor( this.spaceStyles[0].bgColor )
	    .nodeLabel( d => `<span class="nodeLabelGraph3d">${ d.id }</span>` )
	    .nodeOpacity( 0.9 )
	    .linkOpacity( 0.9 )
	    .cooldownTime( 5000 )
			.nodeVisibility( true )
			.linkVisibility( true )
			.onEngineTick( Graph3D.onEngineTick.bind(this) )
			.linkThreeObjectExtend( false );

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
	* Return colour gradient
	* @static
	* @param {number} grad Value from 0 to 1
	* @return {string} RGB colour
	*/
	static colorGradient(grad) {
		const low = [ 32, 255, 255 ]; // RGB
		const mid = [ 255, 255, 0 ];
		const hi = [ 255, 32, 32 ];

    let c1 = grad < 0.5 ? low : mid;
    let c2 = grad < 0.5 ? mid : hi;
    let fade = grad < 0.5 ? 2 * grad : 2 * grad - 1;

		let c = c1.map( (x,i) => Math.floor( x + (c2[i] - x) * fade ));
    return 'rgb(' + c.join(",") + ')';
	}

	/**
	* Update hyperedges and hypersurfaces
	* @param {Object} o Link object
	* @param {Object} coord Start and end
	* @param {Object} l Link
	* @return {boolean} False.
	*/
	static linkPositionUpdate( o, coord, l ) {
		if ( !l.hyperedge ) return false;

		if ( l.hyperedge.length === 1 ) {
			Object.assign(o.position, coord.start);
			let f = 20 + Math.min( 20, Math.pow(l.scale,3/5) * 10 );
			o.scale.set( f, f, 0 );
			if ( l.hasOwnProperty("grad") ) {
				o.material.color.set( Graph3D.colorGradient( l.grad ) );
			} else {
				o.material.color.set( this.spaceStyles[4].ring );
			}
		} else {
			const p = o.geometry.attributes.position;
			let i = 0;
			Graph3D.triangulate( l.hyperedge ).forEach( t => {
				if ( t[0] !== t[1] && t[0] !== t[2] && t[1] !== t[2] ) {
					t.forEach( v => {
						p.array[ i++ ] = v.x;
						p.array[ i++ ] = v.y;
						p.array[ i++ ] = v.z;
					});
				}
			});
			if ( l.hasOwnProperty("grad") ) {
				o.material.color.set( Graph3D.colorGradient( l.grad ) );
			} else {
				o.material.color.set( this.spaceStyles[4].fill );
			}
			p.needsUpdate = true;
		}
		return true;
	}

	/**
	* Update hypersurfaces
	*/
	static onEngineTick() {
		this.HS.forEach( hs => {
			const ps = [];
			hs.vs.forEach( v => {
				if ( !isNaN(v.x) ) ps.push( new Vector3( v.x, v.y, v.z ) );
			});
			if ( ps.length > 3) {
				hs.mesh.geometry.dispose();
				hs.mesh.geometry = new ConvexGeometry( ps );
				hs.mesh.geometry.attributes.position.needsUpdate = true;
			}
		});
	}

	/**
	* Custom link objects.
	* @param {Object} l Link
	* @return {Object} ThreeJS Object3D obj or false.
	*/
	static linkThreeObject( l ) {
		if ( !l.hyperedge ) return false; // Not a custom obj
		if ( l.hyperedge.length === 1 ) {
			let sprite = new Sprite( this.circlematerial.clone() );
			return sprite;
		} else {
			const cs = [];
			Graph3D.triangulate( l.hyperedge ).forEach( t => {
				if ( t[0] !== t[1] && t[0] !== t[2] && t[1] !== t[2] ) {
					t.forEach( v => cs.push( v.x, v.y, v.z ) );
				}
			});
			if ( cs.length === 0 ) return false; // Use regular edge
			const geom = new BufferGeometry();
			const positions = new Float32Array( cs );
			const normals = new Float32Array( cs.length );
			geom.setAttribute( 'position', new BufferAttribute( positions, 3 ) );
			geom.setAttribute( 'normal', new BufferAttribute( normals, 3 ) );
			geom.computeVertexNormals();
			return new Mesh(geom, this.hyperedgematerial.clone() );
		}
	}

  /**
  * Update 3d force directed graph size.
  * @param {number} width New window width
  * @param {number} height New window height
  */
  size( width, height ) {
    this.FG.width( width );
    this.FG.height( height );
  }

  /**
  * Clear graph.
  */
  clear() {
		// Dispose hypersurfaces
		this.HS.forEach( hs => {
			this.FG.scene().remove( hs.mesh );
			hs.mesh.geometry.dispose();
			hs.mesh.material.dispose();
			hs.mesh = undefined;
		});
		this.HS.length = 0;
		this.HL.length = 0;

    // Clear graph
    super.clear();
  }

  /**
	* Reset graph and set view.
	* @param {number} view Mode, 1 = space, 2 = time
	*/
	reset( view ) {
    // Clear graph
    this.clear();

    // Set view "SPACE"
		if ( view === 1 ) {
			this.view = 1;

	    this.FG
	      .numDimensions( 3 )
	      .dagMode( null )
	      .backgroundColor( this.spaceStyles[0].bgColor )
	      .nodeLabel( n => `<span class="nodeLabelGraph3d">${ n.id }</span>` )
	      .nodeRelSize( this.spaceStyles[0].nRelSize )
	      .nodeVal( n => (n.big ? 8 : 1 ) * this.spaceStyles[n.style].nVal  )
	      .nodeColor( n => (n.hasOwnProperty("grad") && !n.style) ? Graph3D.colorGradient( n.grad ) : this.spaceStyles[n.style].nColor )
	      .linkWidth( l => this.spaceStyles[l.style].lWidth )
	      .linkColor( l => (l.hasOwnProperty("grad") && !l.style) ? Graph3D.colorGradient( l.grad ) : this.spaceStyles[l.style].lColor )
	      .linkCurvature( 'curvature' )
	      .linkCurveRotation( 'rotation' )
	      .linkDirectionalArrowLength(0)
				.linkPositionUpdate( Graph3D.linkPositionUpdate.bind(this) )
				.linkThreeObject( Graph3D.linkThreeObject.bind(this) )
				.nodeThreeObject( null );

			// Set forces
			this.FG.d3Force("link").iterations( 15 );
			this.FG.d3Force("link").strength( l => {
				let refs = Math.min(l.source.refs, l.target.refs) + 1;
				return 1 / refs;
			});
			this.FG.d3Force("link").distance( 50 );
			this.FG.d3Force("center").strength( 1 );
			this.FG.d3Force("charge").strength( -600 );
			this.FG.d3Force("charge").distanceMin( 20 );
			this.force(50,50);
		} else if ( view === 2 ) { // Set view "TIME"
			this.view = 2;

			this.FG
			.numDimensions( 3 )
			.dagMode( "td" )
			.backgroundColor( this.timeStyles[0].bgColor )
			.nodeLabel( n => `<span class="nodeLabelGraph3d">${ n.id }</span>` )
			.nodeRelSize( this.timeStyles[0].nRelSize )
			.nodeVal( n => (n.big ? 8 : 1 ) * this.timeStyles[n.style].nVal )
			.nodeColor( n => (n.hasOwnProperty("grad") && !n.style) ? Graph3D.colorGradient( n.grad ) : this.timeStyles[n.style].nColor )
			.linkWidth( l => this.timeStyles[l.style].lWidth )
			.linkColor( l => (l.hasOwnProperty("grad") && !l.style) ? Graph3D.colorGradient( l.grad ) : this.timeStyles[l.style].lColor )
			.linkCurvature( 0 )
			.linkCurveRotation( 0 )
			.linkDirectionalArrowLength( 20 )
			.linkDirectionalArrowRelPos(1)
			.linkPositionUpdate( null )
			.linkThreeObject( null )
			.nodeThreeObject( null );

			// Set forces
			this.FG.d3Force("link").iterations( 2 );
			this.FG.d3Force("link").strength( l => {
				let refs = 4 * (Math.min(l.source.refs, l.target.refs) + 1);
				return 1 / refs;
			});
			this.FG.d3Force("link").distance( 10 );
			this.FG.d3Force("center").strength( 0.1 );
			this.FG.d3Force("charge").strength( -200 );
			this.FG.d3Force("charge").distanceMin( 1 );
			this.force(50,50);
		} else if ( view === 3 ) {
			this.view = 3;

	    this.FG
	      .numDimensions( 3 )
	      .dagMode( null )
	      .backgroundColor( this.phaseStyles[0].bgColor )
	      .nodeLabel( n => `<span class="nodeLabelGraph3d">${ n.id }</span>` )
	      .nodeRelSize( this.phaseStyles[0].nRelSize )
	      .nodeVal( n => (n.big ? 8 : 4 ) * n.refs  )
	      .nodeColor( n => (n.hasOwnProperty("grad") && !n.style) ? Graph3D.colorGradient( n.grad ) : this.phaseStyles[n.style].nColor )
	      .linkWidth( l => this.phaseStyles[l.style].lWidth )
	      .linkColor( l => (l.hasOwnProperty("grad") && !l.style) ? Graph3D.colorGradient( l.grad ) : this.phaseStyles[l.style].lColor )
				.linkCurvature( 0 )
	      .linkCurveRotation( 0 )
	      .linkDirectionalArrowLength(0)
				.linkPositionUpdate( null )
				.linkThreeObject( null )
				.nodeThreeObject( null );

			// Set forces
			this.FG.d3Force("link").iterations( 15 );
			this.FG.d3Force("link").strength( l => {
				let refs = (Math.min(l.source.refs, l.target.refs) + (10240-l.w)/10240);
				return 1 / refs;
			});
			this.FG.d3Force("link").distance( 50 );
			this.FG.d3Force("center").strength( 1 );
			this.FG.d3Force("charge").strength( -600 );
			this.FG.d3Force("charge").distanceMin( 20 );
		}
	}


	/**
	* Change force dynamics.
	* @param {number} dist Distance 0-100
	* @param {number} decay Decay 0-100
	*/
	force( dist, decay ) {
		if ( this.view === 1 ) {
			if ( dist >= 0 && dist <= 100 ) {
				this.FG.d3Force("link").distance( dist );
				this.FG.d3Force("charge").strength( -10 * (dist + 10) );
			}
			if ( decay >=0 && decay <=100 ) {
				this.FG.d3VelocityDecay( decay / 100 );
			}
		} else if ( this.view === 2 ){
			if ( dist >= 0 && dist <= 100 ) {
				this.FG.dagLevelDistance( (dist * dist) / 2 + 1 );
				this.FG.d3Force("link").distance( dist/10 );
				this.FG.d3Force("charge").strength( -300 );
			}
			if ( decay >=0 && decay <=100 ) {
				this.FG.d3VelocityDecay( decay / 100 );
			}
		} else if ( this.view === 3 ) {
			if ( dist >= 0 && dist <= 100 ) {
				this.FG.d3Force("link").distance( dist );
				this.FG.d3Force("charge").strength( -10 * (dist + 10) );
			}
			if ( decay >=0 && decay <=100 ) {
				this.FG.d3VelocityDecay( decay / 100 );
			}
		}
	}


	/**
	* Refresh graph.
	*/
	refresh() {
		this.FG.graphData( { nodes: this.nodes, links: this.links } );
	}

  /**
  * Highlight nodes/edges.
  * @param {Object} subgraph Edges, nodes and points to highlight.
  * @param {number} style Style to use in highlighting.
  * @param {boolean} surface If true, fill hypersurfaces.
  * @param {boolean} background If false, show only highlighted nodes/edges.
  */
  setHighlight( subgraph, style, surface = true, background = true ) {
    // Big Vertices
    subgraph['p'].forEach( id => {
			let v = this.V.get( id );
			if ( v ) {
				v.big = true;
				v.style |= style;
			}
    });

    // Vertices and hypersurfaces connecting them
    subgraph['v'].forEach( ids => {
			const vs = [], points = [];
			let p;
      ids.forEach( id => {
				let v = this.V.get( id );
        if ( v && !vs.includes(v) ) {
          v.style |= style;
					if ( v.x ) points.push( new Vector3( v.x, v.y, v.z ) );
					vs.push( v );
        }
      });
      if ( surface && points.length > 3 ) {
				const geom = new ConvexGeometry( points );
				const mesh = new Mesh(geom, this.hyperedgematerial.clone() );
				mesh.material.color.set( this.spaceStyles[style].fill );
				// TODO: opaque set?
				this.FG.scene().add( mesh );
				const hs = {
					vs: vs,
					mesh: mesh,
					style: style
				};
				this.HS.push( hs );
      }
    });

    // Hyperedges
    subgraph['e'].forEach( es => {
      es.forEach( e => {
        let vprev = this.V.get( e[0] );
				if ( vprev ) {
					vprev.style |= style;
	        for( let i=1; i<e.length; i++ ) {
	          let v = this.V.get( e[i] );
						if ( v ) {
							v.style |= style;
							let ls = vprev.source.filter( l => v.target.includes(l) );
							ls.forEach( l => l.style |= style );
							if ( ls.length === 0 ) {
								// Not found, add new link
								const hl = {
									source: vprev, target: v,
									style: style
								};
		            this.links.push( hl );
								this.HL.push( hl );
		          }
		          vprev = v;
						}
	        }
				}
      });
    });

    // Show/hide background graph and update
    if ( background ) {
      this.FG.nodeVisibility( true ).linkVisibility( true );
    } else {
      this.FG.nodeVisibility( "style" ).linkVisibility( "style" );
    }

  }

  /**
  * Clear highlight style.
  * @param {number} style Style to be removed.
  */
  clearHighlight( style ) {
		// Remove hypersurfaces
		for( let i=this.HS.length-1; i>=0; i-- ) {
			let hs = this.HS[i];
			if ( hs.style & style ) {
				this.FG.scene().remove( hs.mesh );
				hs.mesh.geometry.dispose();
				hs.mesh.material.dispose();
				hs.mesh = undefined;
				this.HS.splice(i,1);
			}
		}

		// Remove extra highlight links
		for( let i=this.HL.length-1; i>=0; i-- ) {
			const hl = this.HL[i];
			if ( hl.style & style ) {
				this.links.splice( this.links.indexOf( hl ), 1);
				this.HL.splice(i,1);
			}
		}

		// Reset node styles
		this.nodes.forEach( n => {
			delete n.big;
			n.style &= ~style;
		});

		// Reset link styles
		this.links.forEach( l => {
			l.style &= ~style;
		});

    this.FG.nodeVisibility( true ).linkVisibility( true );
  }

  /**
  * Set gradient colours based on field 'grad'
  */
  setField() {
    this.refresh();
  }

  /**
  * Clear gradient
  */
  clearField() {
		// Clear nodes
		this.nodes.forEach( n => {
			delete n.grad;
		});

		// Clear links
		this.links.forEach( l => {
			delete l.grad;
		});

    this.refresh();
  }

	/**
	* Status.
	* @return {Object}
	*/
	status() {
		return { ...super.status() };
	}

}

export { Graph3D };
