# Hypergraph Rewriting System

<img src="screenshot.jpg" width="512">

**Run it: https://met4citizen.github.io/Hypergraph/**

This web app is a hypergraph rewriting system that supports both singleway and
multiway evolutions and can visualize the evolution of the hypergraph in 3D.
The app uses
[3d Force-Directed Graph](https://github.com/vasturiano/3d-force-graph)
for representing graph structures,
[ThreeJS](https://github.com/mrdoob/three.js/)/WebGL for 3D rendering and
[d3-force-3d](https://github.com/vasturiano/d3-force-3d) for the force engine.

## Introduction

A hypergraph is a generalization of a regular graph in which an edge can join
any number of nodes. In a hypergraph rewriting system some initial state is
transformed incrementally by making a series of updates that follow some
abstract rewriting rule.

As an example, consider a rewriting rule
`(1,1,2)(2,3,4)->(1,5,4)(2,5,3)(5,5,4)`. Whenever and wherever a subhypergraph
having the form of the left-hand side pattern `(1,1,2)(2,3,4)` is found in the
hypergraph, it is replaced with a new subhypergraph having the form of the
right-hand side pattern `(1,5,4)(2,5,3)(5,5,4)`.

The matches can also overlap. One way to resolve these conflicts is to pick
one of the overlapping matches according to some ordering scheme and just
ignore the others. Another approach to is to rewrite all the overlapping
matches by allowing the evolution of the system to branch. In the latter case,
the result is a multiway system with many possible histories.

For more information about hypergraph rewriting systems and their potential to
represent fundamental physics visit
[The Wolfram Physics Project](https://www.wolframphysics.org) website.
According to their
[technical documents](https://www.wolframphysics.org/technical-documents/)
certain models can reproduce key features of both relativity and quantum
mechanics.

## Rules

Click `RULE` to modify the rewriting rule, change its settings, and run
the rewriting process.

The system supports several rules separated with a semicolon `;` or written
on separate lines. The two sides of any one-way rule must be separated
with an arrow `->`. The separator `==` can be used as a shortcut for a two-way
setup in which both directions (the rule and its inverse) are possible.

Hyperedge patterns can be described by using numbers, characters or words.
Several types of parentheses are also supported. For example, a rule
`[{x,y}{x,z}]->[{x,y}{x,w}{y,w}{z,w}]` is considered valid and can be
validated and converted to the default number format by clicking `Scan`.

As an experimental extension, the system supports a filter `\`. As an example,
the rule `(1)(1,2)\(2)->(1)(1,2)(2)` is applied only if there is no unary
edge `(2)`. If the branchlike interactions are allowed, the check is made
relative to all possible branches of history.

A rule without any right-hand side, such as `(1,1,1)(1,1,1)`, is used as the
initial graph. An alternative way of to create the initial state is to use
predefined functions:

Initial graph | Description
--- | ---
`complete(n)` | Complete graph with `n` vertices so that each vertex is connected to every other vertex.
`grid(d1,d2,...)` | Grid with sides of length `d1`, `d2`, and so on. The number of parameters defines the dimension of the grid. For example, `grid(2,4,5)` creates a 3-dimensional 2x4x5 grid.
`line(n)` | Line with `n` vertices.
`points(n)` | `n` unconnected unary edges.
`prerun(n)` | Pre-run the current rule for `n` events in one branch (singleway). The leaves of the result are used as an initial state.
`random(n,d,nedges)` | Random graph with `n` vertices so that each vertex is sprinkled randomly in `d` dimensional space and has at least `nedges` connections.
`rule('rule',n)` | Run rewriting rule `rule` for maximum `n` events in one branch (singleway).  The leaves of the result are used as an initial state.
`sphere(n)` | Fibonacci sphere with `n` vertices.

It is also possible to define some specific branch, or a combination of
branches, for the initial state. As an example, `(1,1)(1,1)/7`, would specify
branches 1-3 (the sum of the first three bits 1+2+4). By default, the initial
state is set for all the tracked branches.

If the initial state is not specified, the left-hand side pattern of the first
rule is used, but with only a single node. For example, a rule
`(1,2)(1,3)->(1,2)(1,4)(2,4)(3,4)` gives an initial state `(1,1)(1,1)`.

The `Evolution` option defines which kind of evolution is to be simulated:

Evolution | Description
--- | ---
`1`,`2`,`4` | Singleway system with 1/2/4 branches. By default, random event order is used to resolve overlaps for each branch. If the `WM` option is set, Wolfram model's standard event order is used for branch 1 and its reverse for branch 2.
`FULL` | Full multiway system. All the matches are instantiated and four branches tracked.

The `Interactions` option defines the possible interactions between hyperedges.
Any combination of the three possible interactions can be selected.

Interactions | Description
--- | ---
`SPACE` | Allow interactions between spacelike separated hyperedges. Two edges are spacelike separated if their lowest common ancestors are all updating events. In practice this should always be selected, because the nodes in a typical initial state are spacelike separated.
`TIME` | Allow interaction between timelike separated hyperedges. Two edges are timelike separated if either one of them is an ancestors of the other one, that is, inside the other's past causal cone.
`BRANCH` | Allow interaction between branchlike separated hyperedges. Two edges are branchlike separated if any of their lowest common ancestors is a hyperedge.

Other options:

Option | Description
--- | ---
`WM` | Wolfram Model. If set, the first branch uses Wolfram Model's standard event order (LeastRecentEdge + RuleOrdering + RuleIndex) and the second branch its reverse. By default the setting is off and all tracked branches use random event ordering.
`RO` | Rule order (index). Regardless of other settings, always try to apply the events in the order in which the rules have been specified. By default the setting is off and the individual rules are allowed to mix.
`DD` | De-duplicate. The overlapping new hyperedges on different branches are de-duplicated at the end of each step. This allows branches to merge. EXPERIMENTAL. FUNCTIONALITY LIKELY TO CHANGE.


## Simulation/Observer

Simulation can be run in two different modes: `Space` and `Time`.

In `Space` mode the system shows the evolution of the spatial hypergraph.
According to the Wolfram Model, the spatial hypergraph represents
a spacelike state of the universe with nodes as "atoms of space".

In `Time` mode the system builds up the transitive reduction of the causal
graph. In this view nodes represent updating events and directed
edges their causal relations. According to the Wolfram Model, the flux of
causal edges through spacelike and timelike hypersurfaces is related to
energy and momentum respectively.

Media buttons let you reset the mode, start/pause the simulation and
skip to the end. Whenever the system has branches, the first four
branches can be shown separately or in any combination.

If `Leaves` is set, only the leaf edges are shown. Otherwise the full multiway
system, even the timelike separated edges, are shown. The tracked branches 1-4
can be visualized separately in any combination. The two sliders change the
visual appearance of the graph by tuning the parameters of the underlying
force engine. Note: Changing the viewpoint or the forces do not in anyway
change the multiway system itself.

## Highlighting

Subgraphs can be highlighted by clicking `RED`/`BLUE` and using one or more
of the following commands:

Command | Highlighted | Status Bar
--- | --- | ---
`curv(x,y)` | Two n-dimensional balls of radius one and the shortest path between their centers. | Curvature based on Ollivier-Ricci (1-Wasserstein) distance.
`geodesic(x,y,[dir],[rev],[all])`<br/><br/>`dir` = directed edges<br/>`rev` = reverse direction<br/>`all` = all shortest paths | Shortest path(s) between two nodes.<br/><br/> | Path distance as the number of edges.
`lightcone(x,length)` | Lightcone centered at node `x` with size `length`. `TIME` mode only. | Size of the cones as the number of edges.
`nball(x,radius,[dir],[rev])`<br/><br/>`dir` = directed edges<br/>`rev` = reverse direction | N-dimensional ball is a set of nodes and edges within a distance `radius` from a given node `center`. | Volume as the number of edges.
`nsphere(x,radius,[dir],[rev])`<br/><br/>`dir` = directed edges<br/>`rev` = reverse direction | N-dimensional sphere/hypersurface within a distance `radius` from a given node `x`. | Area as the number of nodes.
`random(x,distance,[dir],[rev])`<br/><br/>`dir` = directed edges<br/>`rev` = reverse direction | Random walk starting from a specific node with some maximum `distance`. | Path distance as the number of edges.
`surface(x,y)` | Space-like hypersurface based on a range of nodes. | Volume as the number of nodes.
`worldline(x,...)` | Time-like curve of space-like node/nodes. `TIME` mode only. | Distance as the number of edges.
`(x,y)(y,z)`<br>`(x,y)(y,z)\(z)->(x,y)` | Subhypergraphs matching the given rule-based pattern. The right hand side pattern can be used to specify which part of the match is highlighted. `SPACE` mode only. | The number of rule-based matches.



## Scalar Fields

Click `GRAD` to visualize scalar fields. Relative intensity of the field is
represented by different hues of colour from light blue (lowest) to green to
yellow (mid) to orange to red (highest). Field values are calculated for each
edge and the colours of the vertices represent the mean of their edges.

Scalar Field | Description
--- | ---
`branch` | Branch id. With two branches the main colours are blue and red. With four branches blue, green, orange and red. For shared edges the colour is in the middle of the spectrum.
`created` | Creation time from oldest to newest.
`curvature` | Ollivier-Ricci curvature. NOTE: Calculating curvature is a CPU intensive task. If used in real-time it will slow down the animation.
`degree` | The mean of incoming and outgoing edges.
`energy` | The mean of updated edges.
`mass` | The part of `energy` in which the right hand side edges connect pre-existing vertices.
`momentum` | The part of `energy` in which the right hand side edges have new vertices.
`pathcnt` | The number of paths leading to specific edge.
`probability` | Normalized path count for each edge in each step.
`step` | Rewriting step.

The value range can be limited by giving lower and higher limits as
parameters. For example, `branch(2,4)` shows branches 2-4. A limit can also
be given as a percentage. For example, `energy(50%,100%)` highlights
only upper half of the full range.

## Notes

The aim of this project has been to learn some basic concepts and
ideas related to hypergraphs and hypergraph rewriting. Whereas the Wolfram
physics project has been a great inspiration, this project is not directly
associated with it, doesn't use any code from it, and doesn't claim to be
compatible with the Wolfram Model.

As a historical note, the idea of "atoms of space" is not a new one. It already
appears in the old Greek tradition of atomism (*atomos*, "uncuttable") started
by Democritus (ca. 460–370 BCE). In the Hellenistic period the idea was revived
by Epicurus (341–270 BCE) and put in a poetic form by Lucretius (ca. 99–55 BCE).
Unfortunately, starting from the Early Middle Ages, atomism was mostly
forgotten in the Western world until Lucretius' *De Rerum Natura* and other
atomist teachings were rediscovered in the 14th century.

> “The atoms come together in different order and position, like letters,
> which, though they are few, yet, by being placed together in different ways,
> produce innumerable words.”
> -- Epicurus (according to Lactantius)
