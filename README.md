# Hypergraph Rewriting System

<img src="https://repository-images.githubusercontent.com/324783458/88643280-493e-11eb-87cb-910353f32066" width="600">

https://met4citizen.github.io/Hypergraph/

A *hypergraph* is a generalization of a graph in which an edge (called *hyperedge*)
can join any number of *nodes*. In a *hypergraph rewriting system* some initial
hypergraph is transformed incrementally by following some abstract *rewriting rule*.
In each step subhypergraphs with particular canonical form are replaced with
other subhypergraphs with different canonical form.

For more information about hypergraph rewriting systems and their potential to
represent fundamental physics visit [The Wolfram Physics Project](https://www.wolframphysics.org)
website and read [technical documents](https://www.wolframphysics.org/technical-documents/).

The web app uses [3d Force-Directed Graph](https://github.com/vasturiano/3d-force-graph)
for representing graph structures, [ThreeJS](https://github.com/mrdoob/three.js/)/WebGL
for 3D rendering and [d3-force-3d](https://github.com/vasturiano/d3-force-3d) for the
physics engine.

## Rules

Click `RULE` to modify the rewriting rule. Settings include different options for
rule ordering and event orderings and the max number of rewriting events.
Click `RUN` to start the rewriting process. 

An example of a hypergraph rewriting rule:

```
(1,1,2)(2,3,4)->(1,5,4)(2,5,3)(5,5,4)
(1,1,1)(1,1,1)
```

Wherever a subhypergraph in the form of the left-hand side pattern `(1,1,2)(2,3,4)`
is found on the hypergraph, it is replaced with a new subhypergraph in the
form of the right-hand side pattern `(1,5,4)(2,5,3)(5,5,4)`. The two sides must be
separated with an arrow `->`. A rule without the right-hand side is used as the initial
state.

The system supports several rules separated with a semicolon `;` or written
on separate lines. Hyperedge patterns can be described by using numbers and/or
characters. Several types of parentheses are supported. For example, a rule like
`[{x,y}{x,z}]->[{x,y}{x,w}{y,w}{z,w}]` is considered valid and can be
converted to the default format by clicking `Check`.

Some rules to try out (copy-paste only the rule part):

- (1,2,3)(1,4,5)->(3,3,6)(4,5,6)(6,6,5);(1,1,1)(1,1,1)
- (1,1,2)(3,2,4)->(5,1,4)(3,2,3)(5,5,4);(1,1,1)(1,1,1)
- (1,2,2)(1,3,4)->(3,2,5)(5,5,2)(4,5,5);(1,1,1)(1,1,1) | Set event ordering: OLD
- (1,2,2)(1,3,4)->(1,5,2)(2,3,4)(4,5,5);(1,1,1)(1,1,1) | Set event ordering: OLD

## Simulation

Simulation has two supported modes: `Space` and `Time`.

In `Space` mode the system simulates the evolution of the spatial hypergraph with
nodes representing "atoms of space". According to the Wolfram Model, the spatial
hypergraph represents a spacelike state of the universe.

In `Time` mode the system builds up the causal graph. In this view, the nodes are
updating events and the directed edges their causal relationships. According to the
Wolfram Model, the flux of causal edges through spacelike and timelike hypersurfaces
is related to energy and momentum respectively.

Media control buttons let you rewind to the beginning, start/pause simulation and
skip to the end. `Speed` sets the frame rate.

## Highlighting

When the simulation ends, subgraphs can be highlighted by clicking `RED`/`BLUE`
and using one or more of the following commands:

Command | Description | Examples
--- | --- | ---
`geodesic(n1,n2,[dir],[rev],[all])` | Shortest path between two nodes.<br/><br/>Options:<br/>`dir` = directed edges<br/>`rev` = reverse edge direction<br/>`all` = show all shortest paths | `geodesic(0,10,all)`
`nball(center,radius,[dir],[rev])` | A set of nodes/edges within a distance `radius` of a given node `center`.<br/><br/>Options:<br/>`dir` = directed edges<br/>`rev` = reverse edge direction | `nball(0,4)`
`nsphere(center,radius,[dir],[rev])` | N-dimensional sphere from node `center` with `radius`.<br/><br/>Options:<br/>`dir` = directed edges<br/>`rev` = reverse direction | `nsphere(0,4,dir)`
`random(n,[distance],[dir],[rev])` | Random walk starting from a specific node.<br/><br/>Options:<br/>`distance` = max steps<br/>`dir` = use directed edges<br/>`rev` = reverse direction | `random(1)`
`worldline(n)` | Time-like curve of the space-like node.<br/><br/>*Note: Only in `TIME` mode* | `worldline(0)`
`lightcone(n,length)` | Lightcone centered at node `n` with length `length`.<br/><br/>*Note: Only in `TIME` mode* | `lightcone(200,4)`



