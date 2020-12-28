# 3D Hypergraph Rewriting System

A web application to rewrite hypergraphs and represent them in a 3-dimensional space:

https://met4citizen.github.io/Hypergraph/

Uses [3d Force-Directed Graph](https://github.com/vasturiano/3d-force-graph),
[ThreeJS](https://github.com/mrdoob/three.js/)/WebGL for 3D rendering and
[d3-force-3d](https://github.com/vasturiano/d3-force-3d) for the underlying
physics engine.

## Rules

The default rewriting rule can be changed by clicking the button `RULE` and
processed by clicking `RUN`. Settings include different rule/event orderings
and maximum number of rewriting events (size).

A simple example of a hypergraph rewriting rule:

```
(1,1,2)(2,3,4)->(1,5,4)(2,5,3)(5,5,4)
(1,1,1)(1,1,1)
```

Whenever a subgraph matching the rule's left-hand side `(1,1,2)(2,3,4)` is
found on the hypergrap, it is rewritten with a subgraph following
the pattern of to the rule's right-hand side `(1,5,4)(2,5,3)(5,5,4)`.
Lhs and rhs are separated with an arrow `->`.

Rules are separated either with a semicolon `;` or they can be written on
separate lines. A rule without the right-hand side is used as the initial state
of the hypergraph.

Hyperedge patterns can be specified by using numbers and/or characters.
Several types of parentheses are supported.  For example, a rule like
`{x,y}{x,z}->{x,y}{x,w}{y,w}{z,w}` is valid.

## Animation

Animation supports two modes: `Space` and `Time`. `Space` mode displays
the evolution of the spatial graph. `Time` mode displays causal graph of
rewriting events.

Media controls let you rewind to the beginning, start/pause animation and
skip to the end of the animation. `Speed` selects the frame rate (slow/fast).

## Commands (RED/BLUE)

Command | Description
--- | ---
`geodesic(v1,v2,[dir],[rev],[all])` | Shortest path from vertex `v1` to `v2`. Optional: `dir` directed edges, Optional: `rev` reverse direction, `all` show all shortest paths.
`nball(center,radius,[dir],[rev])` | N-dimensional ball from vertex `center` with radius `radius`. Optional: `dir` directed edges, `rev` reverse direction.
`nsphere(center,radius,[dir],[rev])` | N-dimensional sphere from vertex `center` with radius `radius`. Optional: `dir` directed edges, `rev` reverse direction.
`random(v,[distance],[dir],[rev])` | Random walk from vertex `v` . Optional: `distance` max steps, `dir` use directed edges, `rev` reverse direction.
`worldline(v)` | Time-like curve of the vertex `v`. Only in TIME view.
`lightcone(v,length)` | Lightcone centered at `v` with length `length` Only in TIME view.

## References

[Technical documents of the Wolfram Physics Project](https://www.wolframphysics.org/technical-documents/)


