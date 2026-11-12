<?php
$pageTitle = 'Gallery Solitaire — Free Online Card Game';
$pageDescription = "Gallery Solitaire is a clever solitaire card game for a short break with serious addiction potential. Compare your efforts with strategy-less computer play, and let the computer make the obvious moves for you.";
$pageCanonical = 'https://gallery.mapresso.com/';
require_once __DIR__ . '/head.php';
?>

<body>
	<?php require_once __DIR__ . '/header.php'; ?>

	<div class="row clearfix">
		<div class="col-md-12 column">
			<div class="jumbotron">
				<h1>
					<img src="_assets/icons/appicon-50.png" alt="iOS app icon" style="vertical-align: baseline"> Gallery Solitaire
				</h1>
				<strong>Gallery Solitaire is a clever game for a short break with serious addiction potential. </strong>
				<br>Special features:
				<ul>
					<li>You can compare your efforts with the results of strategy-less play: the program just taps randomly on playable cards. It does this many times, starting with the exact same starting situation as yours.</li>
					<li>Gallery introduces “computer-aided-play” (CAP):</li>
					<ul>
						<li>You don’t have to spend time on obvious moves; the computer will make those for you.</li>
						<li>At every moment, the program shows you all playable cards.</li>
						<li>Just tap on a playable card: it finds its correct position automatically.</li>
					</ul>
				<li><em>New</em>: Compare your result with an AI &mdash; a Perfect Information Monte Carlo player replays your exact deal, so you can see how your score stacks up against it. <a href="faq.php#collapsePimc">How it works &raquo;</a></li>
				</ul>
				You concentrate on selecting the playable cards in optimal order to avoid blocking situations and to achieve an excellent score.

				<br>The program saves all results (including the comparison results) and does statistical evaluations on this data.
			</div>
			<div class="container">
				<div class="row clearfix">

					<div class="col-md-6 column">
						<h2>
							<a href="play/" target="_blank">Play here!</a>
						</h2>
						<p>
							<a href="play/" target="_blank"><img src="_assets/img/online.png" alt="Appstore" align="right"></a>30.11.2023: The current version of Gallery Solitaire is JavaScript based, therefore you can play it directly in your browser!
						</p>
						<p>
							<a class="btn" href="play/" target="_blank">Play here »</a>
						</p>
						<p>
							The game is implemented in <a href="http://p5js.org" title="" target="_blank">p5.js</a>, the <a href="https://github.com/aquilo/Gallery-3/" target="_blank">source code</a> is available on GitHub.
						</p>
						<!-- <p><b>The game no longer works in the Safari browser. On macOS, however, it still works with Chrome.</b></p> -->
					</div>
					<div class="col-md-6 column">
						<h3>
							Discontinued: Free iPhone App
						</h3>
						<p><img src="_assets/img/no_longer_in_app_store.png" alt="No Longer in Appstore" width=135px></a></p>
						<p>The app version had practically the same functionality. Further maintenance of the app was too time-consuming for me. However, I am very happy with the current online version.</p>
						<!-- 						<p><a href="https://itunes.apple.com/us/app/gallery-solitaire/id654080789?mt=8&ign-mpt=uo%3D4"><img src="_assets/img/Download_on_the_App_Store_Badge_US-UK_135x40.svg" alt="Appstore Badge"></a> At the moment unavailable.</p>
						<p>Listed e.g. at <b><a href="https://gameskeys.net/hidden-gems-top-card-games-to-play-on-ios/" target="_blank">GamesKeys: Hidden Games to Play On IOS</a></b> </p> -->
						<p><small>A customer review:<br> "<b>Excellent implementation of a classic game ★★★★★</b>

								<br>I had been hoping someone would develop this for iOS for years. In my opinion, this is the most complex, satisfying solitaire card game in existence, and perfectly suited for iOS. The implementation here is quite solid, and includes the stats that have always made the game especially fun for me. (...)"</small>
						</p>

						<p><small>Another customer:<br> "<b>So glad this game is still available</b>

								<br>II’ve just started playing this again and am reminded of how much I love it, and this app. I love that the developer made the automatic play optional, which was my biggest issue years ago when I first downloaded it. (...) I do love this game and am so glad it’s still available.</small>

						<p><small>And:<br><b>One on my favorite solitaire games!</b>

								<br>I've been playing this game for more than 15 years and still like it. It's a change of pace from regular solitaire games and now that I can play it on my iPad, I'm very happy!</small> </p>




						<p>
							<img src="_assets/img/screenshot1.png" alt="screenshot"><img src="_assets/img/screenshot2.png" alt="screenshot"><img src="_assets/img/screenshot3.png" alt="screenshot">
						</p>
					</div>
				</div>
			</div>
		</div>
	</div>
	<?php require_once __DIR__ . '/footer.php'; ?>

</body>

</html>