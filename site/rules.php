<?php
$pageTitle = 'How to Play Gallery Solitaire — Rules';
$pageDescription = "Rules of Gallery Solitaire: build a face-card gallery of Jacks, Queens and Kings by suit (2-5-8-J, 3-6-9-Q, 4-7-10-K), with layout, setup, hints and computer-aided play explained.";
$pageCanonical = 'https://gallery.mapresso.com/rules.php';
require_once __DIR__ . '/head.php';
?>

<body>
	<?php require_once __DIR__ . '/header.php'; ?>

	<div class="container">
		<div class="row clearfix">
			<div class="col-md-4 column">
				<div class="summary">

					<h1>Summary</h1>
					<p>The object of this <strong>solitaire game</strong> is to build a complete <strong>face-card gallery</strong> of Jacks, Queens, and Kings.</br>You build sequences of cards on the Foundation rows by suit (<strong>building rules</strong>: top row <strong>2-5-8-Jack</strong>; middle <strong>3-6-9-Queen</strong>; bottom <strong>4-7-10-King</strong>) using the cards of the Tableau and the still incorrect cards of the Foundation. Deal cards from the Stock to the Tableau as needed. At the end of the game, let the computer play out the same starting situation a few times.</p>
				</div>
				<div class="rules rulesleft">
					<h1>Details</h1>
					<h2>Layout</h2>
					<center><img src="/_assets/img/screen.png" alt="game" width="214" height="248" /></center></br>
					<h3>Foundation</h3>
					<p>24 piles: 3 rows with 8 columns.</p>
					<p>Empty spots can be filled with the <strong>base cards "2", "3", and "4"</strong>, as above. <strong>Building rule</strong>: Add cards <strong>by suit, in increasing rank, by a difference of 3.</strong></p>
					<p><strong>Cards at their correct position have an altered appearance</strong> (no number, plus a narrow frame).</p>
					<h3>Tableau</h3>
					<p>8 piles are fed by the cards played from the Stock. Only completely visible cards are available for play.</p>
					<h3>Stock</h3>
					<p>The Stock initially consists of two decks (104 cards). As the game begins, the first 24 cards are played to the Foundation. Each time you click Stock, 8 cards move into play, one to each of the Tableau piles.</p>
					<p><strong>Ace Pile</strong>: Aces are automatically removed to the Aces pile and are not a part of play.</p>



				</div>
			</div>
			<div class="col-md-4 column">
				<div class="rules">
					<h2>Setup and Play</h2>
					<p>The game begins by dealing 24 cards, face up, to the Foundation and 8 cards to the Tableau. Some of the cards on the Foundation may now already be at their final position ("2", "3", "4"), and aces go directly to the ace pile. Just <strong>tap on a card</strong> to play it (it finds its correct position automatically).</p>
					<h3>You can now</h3>
					<ul class="b">
						<li>Move "2", "3", "4" cards to empty spaces in the Foundation area</li>
						<li>Move cards of the same suit and of a 3 point higher rank onto already correct cards of the Foundation</li>
						<li>Undo your moves (but only back to the latest operation on the Stock)</li>
						<li>Deal another 8 cards from the Stock to the Tableau.</li>
					</ul>
					<h3>You cannot</h3>
					<ul>
						<li>Place a card onto an incorrect card of the Foundation (even if it would be in the correct row)</li>
						<li>Move cards of the Tableau to another column of the Tableau</li>
						<li>Move groups of cards</li>
						<li>Undo an operation on the Stock.</li>
					</ul>
					<h3>Winning situation</h3>
					<p>You build a complete gallery of all face cards, removing all cards from the Tableau (score: 0)<center><img src="/_assets/img/gallery_success.png" alt="Winning situation" /></center></br />The appearing photos are all from <a href="http://www.myswitzerland.com/en/blenio-valley-valle-di-blenio.html" target="_blank">Blenio Valley</a>, Ticino, Switzerland</p>
					<p><strong>Or</strong>, you make a better score than the computer (see the "Statistics" tab). For your personal evaluation use whatever measure you like (better than the minimum or better than the median or the mean).</li>
						</ul>
					<h2>Hints</h2>
					<ul>
						<li>You do not have to play all cards which are movable.</li>
						<li>Look for the position of the twin card (the card with the same suit and rank). This can help you avoid (final) jamming situations.</li>
						<li>Focus on the optimal sequence of moves.</li>
						<li>Try to resolve "jammed situations": In the Tableau, a card may cover another card which needs to be played on the Foundation first. This creates a jam, which you can resolve using the twin of the trapped card, when it comes into play.</li>
					</ul>
				</div>
			</div>
			<div class="col-md-4 column">
				<p>
				<div class="rules">
					<h2>CAP: "computer-aided play"</h2>
					<ul>
						<li>Yellow shaded cards are movable. Concentrate your efforts on making good decisions instead of searching around for movable cards. </li>
						<li>"<span style="color: #00f;">Jammed </span>situations" are marked by a blue bar.</li>
						<li>In many situations there is no reason not to play a movable card: in these cases CAP does such evident, unproblematic moves automatically. Some obvious cases: <ul>
								<li>the twin card is already in its correct place</li>
								<li>you have two Foundation piles to play a card to</li>
								<li>the twin card is below your card on the Tableau pile</li>
								<li>etc.</li>
							</ul>
						</li>
					</ul>
					<ul>
						<li>If there is no movable card, the Stock is marked by a blue point. Click on Stock to get 8 more cards.
						<li>With the exception of actions on the Stock you can <strong>undo</strong> one or more moves.</li>
					</ul>
					<h2>Evaluations</h2>
					<p><img src="/_assets/img/eval.png" alt="eval" align="left" style="padding: 12px 8px 6px 3px" />During the evaluation process each single result of the random process gets a small square. <span style="color: #00f;font-weight:bold;">Blue</span>: your result is better - <span style="color: #999;font-weight:bold;">white</span>: drawn - <span style="color: #f00;font-weight:bold;">red</span>: computer is better - <span style="color: #090;font-weight:bold">green</span>: solved game (result 0).</p>
					<h3>Thanks</h3>
					<p>Thanks to Karen Morris for editing the texts. The nostalgic card faces are still the ones by Mike Casteel. The new ones are <a href="http://code.google.com/p/vectorized-playing-cards" target="_blank">Vectorized Playing Cards 1.3</a>, Copyright 2011 - Chris Aguilar, Licensed under <a href="http://www.gnu.org/copyleft/lesser.html" target="_blank">LGPL 3</a>
				</div>
			</div>
			</p>
		</div>
	</div>
	</div>

	</div>
	<?php require_once __DIR__ . '/footer.php'; ?>

</body>

</html>