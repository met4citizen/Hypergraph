# Hypergraph Rewriting System

<img src="screenshot.jpg" width="512">

**Run it: https://met4citizen.github.io/Hypergraph/**

A hypergraph is a generalization of a regular graph in which an edge can join
any number of nodes. In a hypergraph rewriting system some initial hypergraph
is transformed incrementally by making a series of updates that
follow some abstract rewriting rule. That is, by following a given rule,
subhypergraphs with particular canonical form are replaced with other
subhypergraphs with different canonical form.

For more information about hypergraph rewriting systems and their potential to
represent fundamental physics visit
[The Wolfram Physics Project](https://www.wolframphysics.org) website. According
to their
[technical documents](https://www.wolframphysics.org/technical-documents/)
certain models exhibiting the Church-Rosser property ("causal invariance")
reproduce key features of both relativity and quantum mechanics.

The web app uses
[3d Force-Directed Graph](https://github.com/vasturiano/3d-force-graph)
for representing graph structures,
[ThreeJS](https://github.com/mrdoob/three.js/)/WebGL for 3D rendering and
[d3-force-3d](https://github.com/vasturiano/d3-force-3d) for the force engine.

## Rules

Click `RULE` to modify the rewriting rule and change its settings. Settings include
different options for rule ordering and event orderings and the max number of
rewriting events. Click `RUN` to start the rewriting process.

An example of a hypergraph rewriting rule:

```
(1,1,2)(2,3,4)->(1,5,4)(2,5,3)(5,5,4)
(1,1,1)(1,1,1)
```

In this case, wherever a subhypergraph in the form of the left-hand side
pattern `(1,1,2)(2,3,4)` is found on the hypergraph, it is replaced with a new subhypergraph in the form of the right-hand side pattern
`(1,5,4)(2,5,3)(5,5,4)`. The two sides of any one-way rule must be separated
with an arrow `->`. The separator `==` can be used as a shortcut for a two-way
setup with the rule and its inverse.

Hyperedge patterns can be described by using numbers and/or
characters. Several types of parentheses are supported. For example, a rule like
`[{x,y}{x,z}]->[{x,y}{x,w}{y,w}{z,w}]` is considered valid and can be
converted to the default format by clicking `Scan`.

A rule without the right-hand side `(1,1,1)(1,1,1)` is used as the initial
state. An alternative way of specifying the initial state is to use some of
the predefined functions described in the following table.

Initial graph | Description
--- | ---
`points(n)` | Create `n` vertices.
`line(n)` | Create a line with `n` vertices.
`grid(n,dim)` | Create a `dim` dimensional grid with approximately `n` vertices.
`sphere(n)` | Create a sphere with `n` vertices.
`random(n,dim,nedges)` | Create a random graph with `n` vertices each with minimum `nedges` edges by springling random points in `dim` dimensions.
`complete(n)` | Create a complete graph `n` vertices each connected to every other vertex.
`blackhole(n,rs)` | Create a black hole with `n` vertices and Schwarzschild radius `rs`. (Experimental)
`blackhole2(n,rs)` | Create a twin black hole both with `n` vertices and Schwarzschild radius `rs`. (Experimental)
`erb(n,rs)` | Create a Einstein-Rosen Bridge both sides with `n` vertices and Schwarzschild radius `rs`. (Experimental)

The system supports several rules separated with a semicolon `;` or written
on separate lines. If several rules are specified, the rule order setting
is used to define whether their relative order matters.

Rule order | Description
--- | ---
`NON` | None. Follow event ordering without sorting based on rules. In other words, allow mixing of the rules.
`NDX` | Index order. Regardless of event ordering, always try to apply the event updates in the order in which rules are specified.
`REV` | Reverse index order. Regardless of event ordering, always try to apply the event updates in the *reverse* order in which rules are specified.

During the rewriting process there are often several overlapping matches for
the left-hand side part of the rule. In these cases event ordering setting
is used to decide which of the overlapping matches are replaced and which are
ignored.

Event order | Description
--- | ---
`RND` | Random order shuffles all possible update events.
`ASC` |  Ascending time order sorts update events so that the least recent match based on the past events is applied first.
`DEC` | Descending time order Sort update event so that the most recent match based on the the past events is applied first.

According to the Wolfram model, applying all the matches simultaneously
gives rise to quantum mechanics. This means that this simulator shows only
one possible classical evolution of the hypergraph.

## Simulation

Simulator currently supports two modes: `Space` and `Time`.

In `Space` mode the system simulates the evolution of the hypergraph.

In `Time` mode the system builds up the causal graph. On, to be more precise,
the transitive reduction of the full causal graph. In this view, the nodes
are updating events and the directed edges their causal relationships.

Media control buttons let you reset the mode, start/pause simulation and
skip to the end / reheat force engine.

According to the Wolfram Model, the (spatial) hypergraph represents a spacelike
state of the universe with nodes as "atoms of space". In the causal graph,
the flux of causal edges through spacelike and timelike hypersurfaces is
related to energy and momentum respectively.

## Highlighting

When the simulation ends, subgraphs can be highlighted by clicking `RED`/`BLUE`
and using one or more of the following commands:

Command/Examples | Description
--- | ---
`geodesic(n1,n2,[dir],[rev],[all])`<br/><br/>geodesic(0,10)<br/>geodesic(10,200,all) | Shortest path between two nodes.<br/><br/>`dir` = directed edges<br/>`rev` = reverse direction<br/>`all` = all shortest paths<br/><br/>Status line: Distance as the number of edges.
`curv(n1,n2)`<br/><br/>curv(0,10) | Curvature between two nodes based on Ollivier-Ricci (1-Wasserstein) distance.<br/><br/>Status line: Curvature.
`nball(center,radius,[dir],[rev])`<br/><br/>nball(0,4) | N-dimensional ball is a set of nodes and edges within a distance `radius` of a given node `center`.<br/><br/>Status line: N-dimensional volume as the number of edges.
`nsphere(center,radius,[dir],[rev])`<br/><br/>nsphere(0,4) | N-dimensional sphere/hypersurface is a set of nodes within a distance `radius` of a given node `center`.<br/><br/>Status line: N-dimensional area as the number of nodes.
`random(n,distance,[dir],[rev])`<br/><br/>random(1,100,dir) | Random walk starting from a specific node with some maximum `distance`.<br/><br/>Status line: Distance as the number of edges.
`(x,y)(y,z)`<br/><br/>`(1,2,3)(3,4,5)`<br/>(x,y)(x,z,y)(x,u,y) | Hypersurfaces matching the given rule-based pattern. With a prefix '-' the matched hypersurfaces are excluded from the results. NOTE: Matching is always done in `SPACE` mode and only projected to `TIME` mode by highlighting worldlines of the matched hypersurface.<br/><br/>Status line: Number of rule-based matches.
`space(n1,n2)`<br/><br/>space(100,150) | Space-like hypersurface based on a range of nodes. `SPACE` mode only.<br/><br/>Status line: N-dimensional volume as the number of nodes.
`time(t1,t2)`<br/><br/>time(300,350) | Time-like hypersurface based on a range of iterations. `TIME` mode only.<br/><br/>Status line: N-dimensional volume as the number of nodes.
`worldline(n1,n2,...)`<br/><br/>worldline(0)<br/>worldline(1,2) | Time-like curve of space-like node/nodes. `TIME` mode only.<br/><br/>Status line: Distance as the number of edges.
`lightcone(n,length)`<br/><br/>lightcone(200,4) | Lightcone centered at node `n` with size `length`. `TIME` mode only.<br/><br/>Status line:<br/>Size of the past and future lightlike cones as the number of edges.

## Notes

The aim of this project for me has been / is to learn some basic concepts and
ideas related to hypergraphs and hypergraph rewriting.

Whereas the Wolfram physics project has been a great inspiration to me,
this project is not directly associated with it, doesn't use any code from it,
and doesn't claim to be compatible with the Wolfram model.

As a historical note, the Wolfram Model comes out of the old Greek tradition of
atomism started by Leucippus (5thC BCE) and his pupil Democritus
(ca. 460–370 BCE). In the Hellenistic period the idea was revived by Epicurus
(341–270 BCE) and described by a Roman poet Lucretius (ca. 99–55 BCE).
Unfortunately, starting from the Early Middle Ages, atomism was mostly
forgotten in the Western world until Lucretius' *De rerum natura*
(On the Nature of Things) and other atomist teachings were rediscovered in the
14th century. - It should also be noted that Wolfram's "atoms of space" is much
closer to the ancient Greek idea of *atomos* ("uncuttable") than what chemists
would now call atoms.

> “The atoms come together in different order and position, like letters,
> which, though they are few, yet, by being placed together in different ways,
> produce innumerable words.”
> -- Epicurus, according to Lactantius
