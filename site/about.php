<?php
$pageTitle = 'About Gallery Solitaire — History since 1993';
$pageDescription = "About Gallery Solitaire and its author Adrian Herzog: from the 1993 Macintosh game via the Java applet and Dashboard widget to today's browser version.";
$pageCanonical = 'https://gallery.mapresso.com/about.php';
require_once __DIR__ . '/head.php';
?>

	<body>
		<?php require_once __DIR__ . '/header.php'; ?>
		<div class="container">

			<section class="contact-section section">
				<h2 class="section-title">Contact</h2>
				<p>If you have any feedback or ideas, please choose send me an email:</p>
				<p>
				<ul class="contact-list" style="list-style-type:none">

					<li class="nav-item">
						<a class="email-link icon-link nav-link" href="mailto:gallery@mapresso.com" target="_blank">gallery@mapresso.com</a>
					</li>

					<!-- 					<li class="nav-item">
						<a class="twitter-link icon-link nav-link" href="https://twitter.com/dropbox" target="_blank">@gallerysol1</a>
					</li>

					<li class="nav-item">
						<a class="facebook-link icon-link nav-link" href="https://facebook.com/GallerySol" target="_blank">Gallery Solitaire</a>
					</li> -->

				</ul>
			</section>
			<h2 class="section-title">Ideas</h2>
			<ul>
				<li>Optimized cards</li>
				<li>Dark mode</li>
			</ul>
			<h2 class="section-title">History</h2>
			<h3> Current Version: JavaScript</h3>

			<h3> iOS Version</h3>
			<p>2013 - 2023. Technologies used: processing.js, Sencha Touch, Apache Cordova. <br>
				Maintaining the app was time-consuming due to its complicated setup. This, combined with the increased demands placed on apps, led me to discontinue further development of the iOS app.</p>


			<h3> MacOS Version</h3>
			<p>This first version was written in Pascal. Strange, but this program is <a href="http://archive.info-mac.org/_Game/crd/gallery-30.hqx" target="_blank">here</a> still downloadable.<br><br></p>
			<pre><small>Info-Mac Digest             Wed, 21 Apr 93       Volume 11 : Issue 84

Date: Thu, 8 Apr 1993 14:53:48 GMT
From: Adrian Herzog &lt;K377212%CZHRZU1A.BITNET@Forsythe.Stanford.EDU&gt;
Subject: [*] Gallery 3.0 (solitaire card game)

Gallery is a classical solitaire card game with following
particularities:

- Comparison of your score with the result of a "non-strategy" (i.e.
  doing all legal moves in random order): Because of the great amount
  of unpredictable situations even a good player looses games (about
  20%).
- Statistics: The scores are recorded and evaluated; for further
  analysis you can write them out to a text file.
- CAP: "computer aided playing" (optional). Level 1: Markers indicate
  movable cards. Level 2: Gallery does evident, unproblematic moves
  automatically for you. In most situations you have the choice from
  different movable cards (or in many situations, to wait with some moves).
  Thus, you concentrate your efforts in taking good decisions instead
  of looking for movable cards.

Changes in version 3.0: Extended CAP options, minor bug fixing,
  balloon help, preference file etc.

Gallery is free (but my children like postcards). Enjoy!

Adrian Herzog
K377212@CZHRZU1A  or  herzog@gis.geogr.unizh.ch

[Archived as /info-mac/game/gallery-30.hqx; 108K]
</small></pre>
			<img src="_assets/img/gallery_all.gif" alt="old MacOS game" width="427" height="314" />
			<h3> MacOS Dashboard Version</h3>
			<p>The <a href="https://www.apple.com/downloads/dashboard/games/gallerysolitaire.html" target="_blank">Dashboard Widget (Mac OS X)</a> is based on the Java applet implementation.<br>
				<img src="_assets/img/screen_dashboard.png" alt="Java Applet Version" width="517" height="410" />
			</p>
			<h3> Java Applet Version</h3>
			With the decreasing support of Java for applets I had to stop the support for the Java applet version; current browsers can no longer run it. Today Gallery Solitaire runs <a href="play/" target="_blank">directly in your browser</a>.
		</div>
		<?php require_once __DIR__ . '/footer.php'; ?>
	</body>

	</html>