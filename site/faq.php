<?php
$pageTitle = 'FAQ — Gallery Solitaire';
$pageDescription = "Frequently asked questions about Gallery Solitaire: automove, statistics, computer-aided play, and other common questions about the game.";
$pageCanonical = 'https://gallery.mapresso.com/faq.php';
require_once __DIR__ . '/head.php';
?>

<body>
	<?php require_once __DIR__ . '/header.php'; ?>

	<div class="container">
		<div class="row">
			<div class="col-lg-12">
				<h1 class="page-header">FAQ
					<small>Frequently Asked Questions</small>
				</h1>
			</div>
		</div>
		<div class="row">
			<div class="col-lg-12">
				<div class="panel-group" id="accordion">
										<div class="panel panel-default">
						<div class="panel-heading">
							<h4 class="panel-title">
								<a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion" href="#collapsePimc">
									How does the built-in AI actually decide its moves? (Perfect Information Monte Carlo)
								</a>
							</h4>
						</div>
						<div id="collapsePimc" class="panel-collapse collapse">
							<div class="panel-body">
								<p><strong>The core problem.</strong> In this game, almost everything is visible at any given moment &mdash; the only hidden information is the order of the still-undrawn stock cards. A truly &ldquo;perfect&rdquo; AI would have to reason under this uncertainty, which is algorithmically much harder than a game played with all cards face up. Perfect Information Monte Carlo (PIMC) sidesteps the problem with a trick: instead of modeling the uncertainty directly, the AI briefly pretends it knows exactly how the stock is ordered &mdash; and repeats this with many different, randomly guessed orderings. In the end, it averages over all these &ldquo;imagined&rdquo; playthroughs.</p>
								<p><strong>Step 1 &mdash; Determinize.</strong> For every move it is currently considering, the AI takes a copy of the game state and reshuffles only the hidden part of the stock at random. This is called &ldquo;determinizing&rdquo;: a concrete, fully visible guess about what is actually hidden. Importantly, this is pure fiction used only for evaluation &mdash; the real, actually-dealt order of the stock is never touched and stays exactly as it was for the real game.</p>
								<p><strong>Step 2 &mdash; Roll out to the end.</strong> In this imagined world, the AI plays the game out to the end (or up to 300 moves) &mdash; not with an expensive search, but with a very cheap, fast policy: simply a random, legal move at each step. This produces a concrete score at the end (0 = perfectly solved, higher is worse).</p>
								<p><strong>Step 3 &mdash; Average and choose.</strong> This whole process runs 160 times for every move under consideration, each time with a freshly reshuffled stock. The average of these 160 final scores becomes the move's evaluation. The AI compares all currently legal moves this way and picks the one with the lowest average. The entire procedure repeats after every single move, using the updated, real game state &mdash; so the AI isn't planning one big tree in advance; at every move it asks itself anew: &ldquo;Which of my currently available options looks best on average, across 160 plausible futures?&rdquo;</p>
								<p><strong>A small refinement.</strong> There is one targeted extra rule, based on a player observation: if a move completes a foundation with a Jack, Queen, or King that was sitting alone on a tableau pile (so the move doesn't uncover anything new &mdash; it &ldquo;doesn't hurt, but doesn't help either&rdquo;), and a twin of that card (this is a double-deck game) is still in play elsewhere, that option gets a tiny penalty. The reasoning: that second copy might still be useful later as a &ldquo;cap&rdquo; to cover another pile. This is a pure tie-breaking refinement, not a fundamental part of the mechanism.</p>
								<p><strong>Fairness towards you.</strong> The AI gets exactly one real attempt at the same deal as you &mdash; no more, no less. It doesn't &ldquo;cheat&rdquo; when it comes to actually making its moves; it only guesses internally to decide what to do next. As a sanity check, the recorded move list is independently replayed at the end on a fresh copy of the real deal, verifying that it produces exactly the same score &mdash; a kind of automatic self-test against bugs.</p>
								<p><strong>Limits of the approach.</strong> PIMC is deliberately pragmatic, not optimal. Because the rollout uses a very simple random policy instead of a real search, the 160 samples are only a rough estimate &mdash; especially early in the game, when enormous numbers of continuations are still possible, this can under- or overestimate how good an option really is. PIMC also has a known theoretical weakness (called &ldquo;strategy fusion&rdquo; in the literature): it evaluates each guessed world on its own and then averages, but it can't truly hedge across several possible worlds at once or deliberately gather information &mdash; a perfectly rational agent under uncertainty could sometimes still play a bit smarter. Still, this is far from a naive approach: the very same underlying principle is used in strong computer bridge and skat programs, where hidden information is likewise the core problem.</p>
								<p><strong>In short:</strong> the AI isn't a tree-search algorithm &mdash; it's &ldquo;try out 160 plausible futures and pick the move that leaves the fewest cards behind on average,&rdquo; recomputed freshly after every single move, with a small experience-based tie-breaker on top.</p>
							</div>
						</div>
					</div>
					<div class="panel panel-default">
						<div class="panel-heading">
							<h4 class="panel-title">
								<a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion" href="#collapseOne">
									Will there be an Apple Watch version?
								</a>
							</h4>
						</div>
						<div id="collapseOne" class="panel-collapse collapse">
							<div class="panel-body">
								Of course not! ;-)
							</div>
						</div>
					</div>
					<div class="panel panel-default">
						<div class="panel-heading">
							<h4 class="panel-title">
								<a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion" href="#collapse14">
									I don't like the automove feature. I'd like to make all my decisions! Is there such a feature?
								</a>
							</h4>
						</div>
						<div id="collapse14" class="panel-collapse collapse">
							<div class="panel-body">
								I changed my mind: you can now switch off the automove option. Personally, I don't like to search a long time for movable cards - something that the computer can better. I like to concentrate on making the correct moves.
							</div>
						</div>
					</div>
					<div class="panel panel-default">
						<div class="panel-heading">
							<h4 class="panel-title">
								<a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion" href="#collapse15">
									How could I further evaluate my results?
								</a>
							</h4>
						</div>
						<div id="collapse15" class="panel-collapse collapse">
							<div class="panel-body">
								I'm working on a R script to get a deeper insight in the results (after I send the results by the exporting function to my computer). In the future I'd like to offer an online tool.
							</div>
						</div>
					</div>
					<div class="panel panel-default">
						<div class="panel-heading">
							<h4 class="panel-title">
								<a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion" href="#collapse16">
									... would be a cool feature!
								</a>
							</h4>
						</div>
						<div id="collapse16" class="panel-collapse collapse">
							<div class="panel-body">
								Don't hesitate and send <a href="mailto:gallery@mapresso.com">me</a> a mail!
							</div>
						</div>
					</div>
					<div class="panel panel-default">
						<div class="panel-heading">
							<h4 class="panel-title">
								<a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion" href="#collapseThree">
									What is that photo here on top of each page?
								</a>
							</h4>
						</div>
						<div id="collapseThree" class="panel-collapse collapse">
							<div class="panel-body">
								The <a href="
http://doi.org/10.3932/ethz-a-000295434" target="_blank"> photo</a> is by <a href="http://en.wikipedia.org/wiki/Walter_Mittelholzer" target="_blank">Walter Mittelholzer</a> from 1923. It shows the <a href="http://en.wikipedia.org/wiki/Rheinwaldhorn" target="_blank">Adula (aka Rheinwaldhorn)</a> on the border of the Cantons Grisons and Ticino in Switzerland. Thanks to the <a href="https://ba.e-pics.ethz.ch" target="_blank">Archive of the ETH-Bibliothek </a> where you find around 2 million images.
							</div>
						</div>
					</div>
					<div class="panel panel-default">
						<div class="panel-heading">
							<h4 class="panel-title">
								<a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion" href="#collapseFour">
									Where is the Java Applet version?
								</a>
							</h4>
						</div>
						<div id="collapseFour" class="panel-collapse collapse">
							<div class="panel-body">
								Java applets no longer run in current browsers, so the applet version has been retired. The current version runs directly in your browser: <a href="play/" target="_blank">play here</a>.
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
	<?php require_once __DIR__ . '/footer.php'; ?>
</body>

</html>