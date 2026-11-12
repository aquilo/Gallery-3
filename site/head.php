<!DOCTYPE html>
<html lang="en">

<head>
	<meta charset="utf-8">
	<?php
	$pageTitle       = $pageTitle       ?? 'Gallery Solitaire';
	$pageDescription = $pageDescription ?? 'Gallery Solitaire is a clever solitaire card game for a short break with serious addiction potential. Compare your efforts with strategy-less computer play, and let the computer make the obvious moves for you.';
	$h = fn($s) => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
	?>
	<title><?= $h($pageTitle) ?></title>
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta name="description" content="<?= $h($pageDescription) ?>">
	<?php if (!empty($pageCanonical)): ?>
	<link rel="canonical" href="<?= $h($pageCanonical) ?>">
	<meta property="og:url" content="<?= $h($pageCanonical) ?>">
	<?php endif; ?>
	<meta property="og:type" content="website">
	<meta property="og:title" content="<?= $h($pageTitle) ?>">
	<meta property="og:description" content="<?= $h($pageDescription) ?>">
	<meta name="author" content="Adrian Herzog">
	<META NAME="Keywords" CONTENT="Solitaire, patience, statistical game evaluation, computer aided playing">
	<link rel="me" href="https://vis.social/@adiherzog">
	<!--link rel="stylesheet/less" href="less/bootstrap.less" type="text/css" /-->
	<!--link rel="stylesheet/less" href="less/responsive.less" type="text/css" /-->
	<!--script src="_assets/js/less-1.3.3.min.js"></script-->
	<!--append ‘#!watch’ to the browser URL, then refresh the page. -->
	<link href="_assets/css/bootstrap.min.css" rel="stylesheet">
	<link href="_assets/css/style.css" rel="stylesheet">
	<!-- HTML5 shim, for IE6-8 support of HTML5 elements -->
	<!--[if lt IE 9]>
		<script src="_assets/js/html5shiv.js"></script>
		<![endif]-->
	<!-- Fav and touch icons -->
	<link rel="apple-touch-icon" sizes="57x57" href="/_assets/icons/apple-touch-icon-57x57.png">
	<link rel="apple-touch-icon" sizes="60x60" href="/_assets/icons/apple-touch-icon-60x60.png">
	<link rel="apple-touch-icon" sizes="72x72" href="/_assets/icons/apple-touch-icon-72x72.png">
	<link rel="apple-touch-icon" sizes="76x76" href="/_assets/icons/apple-touch-icon-76x76.png">
	<link rel="apple-touch-icon" sizes="114x114" href="/_assets/icons/apple-touch-icon-114x114.png">
	<link rel="apple-touch-icon" sizes="120x120" href="/_assets/icons/apple-touch-icon-120x120.png">
	<link rel="apple-touch-icon" sizes="144x144" href="/_assets/icons/apple-touch-icon-144x144.png">
	<link rel="apple-touch-icon" sizes="152x152" href="/_assets/icons/apple-touch-icon-152x152.png">
	<link rel="apple-touch-icon" sizes="180x180" href="/_assets/icons/apple-touch-icon-180x180.png">
	<link rel="icon" type="image/png" href="/_assets/icons/favicon-32x32.png" sizes="32x32">
	<link rel="icon" type="image/png" href="/_assets/icons/android-chrome-192x192.png" sizes="192x192">
	<link rel="icon" type="image/png" href="/_assets/icons/favicon-96x96.png" sizes="96x96">
	<link rel="icon" type="image/png" href="/_assets/icons/favicon-16x16.png" sizes="16x16">
	<link rel="manifest" href="/_assets/icons/manifest.json">
	<link rel="mask-icon" href="/_assets/icons/safari-pinned-tab.svg" color="#5bbad5">
	<meta name="msapplication-TileColor" content="#da532c">
	<meta name="msapplication-TileImage" content="/_assets/icons/mstile-144x144.png">
	<meta name="theme-color" content="#ffffff">
	<link rel="shortcut icon" href="_assets/icons/favicon.png">
	<script type="text/javascript" src="_assets/js/jquery.min.js"></script>
	<script type="text/javascript" src="_assets/js/bootstrap.min.js"></script>
	<script type="text/javascript" src="_assets/js/scripts.js"></script>
	<script>
		(function(i, s, o, g, r, a, m) {
			i['GoogleAnalyticsObject'] = r;
			i[r] = i[r] || function() {
				(i[r].q = i[r].q || []).push(arguments)
			}, i[r].l = 1 * new Date();
			a = s.createElement(o),
				m = s.getElementsByTagName(o)[0];
			a.async = 1;
			a.src = g;
			m.parentNode.insertBefore(a, m)
		})(window, document, 'script', '//www.google-analytics.com/analytics.js', 'ga');

		ga('create', 'UA-61462302-1', 'auto');
		ga('send', 'pageview');
	</script>
	
</head>