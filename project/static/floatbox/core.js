/*
* Floatbox 8.3.2 - 2019-09-20
* Copyright (c) 2019 Byron McGregor
* License: MIT (see LICENSE.txt for details)
* Website: https://floatboxjs.com/
*/

( function () {
	var
		self = window,
		parent = self.parent,
		document = self.document,
		fb = self.fb,  // makes lint happy
		data = fb.data,

	// api functions defined in floatbox.js
		$ = fb.$,
		select = fb.select,
		require = fb.require,
		extend = fb.extend,
		addEvent = fb.addEvent,
		removeEvent = fb.removeEvent,
		stopEvent = fb.stopEvent,
		serialize = fb.serialize,
		getClass = fb.getClass,
		hasClass = fb.hasClass,
		addClass = fb.addClass,
		attr = fb.attr,
		typeOf = fb.typeOf,
		encodeHTML = fb.encodeHTML,
		decodeHTML = fb.decodeHTML,
		fbPath = fb.path,
		smallScreen = fb.smallScreen,  // boolean

	// utility functions (and data) from floatbox.js
		setTimer = data.setTimer,
		clearTimer = data.clearTimer,
		trigger = data.trigger,
		parseUrl = data.parseUrl,
		parseOptions = data.parseOptions,
		makeOptionString = data.makeOptionString,
		getOwnerView = data.getOwnerView,
		newElement = data.newElement,
		placeElement = data.placeElement,
		getTagName = data.getTagName,
		patch = data.patch,
		multiAssign = data.multiAssign,
		deleteProp = data.deleteProp,
		settings = data.settings,
		timeouts = data.timeouts,
		locationUrl = data.locationUrl,

	// screen and input data
		tapInfo = {},
		viewport = { left: 0, top: 0 },
		clientOrigin = { left: 0, top: 0 },
		visualOrigin = { left: 0, top: 0 },

	// mathematical minification mechanisms & miscellanea
		mathRound = Math.round,
		mathMax = Math.max,
		mathMin = Math.min,
		mathAbs = Math.abs,
		mathPow = Math.pow,
		randomInt = function ( i ) {  // + 1 causes inclusion of the end point [0, i]
			return Math.random() * ( i + 1 ) << 0;
		},
		infinity = 1 / 0,
		now = Date.now,
		isArray = Array.isArray,
		undefined = void 0,

	// constants (will get substituted with raw values by the make script)
	// box state
		STATE_end = 0,  // must be falsey, set in phase 0 of end
		STATE_boot = 1,  // set in boot
		STATE_start = 2,  // set at the end of boot, just before calling launchItem for 1st item
		STATE_change = 3,  // set at the end of showItem, just before calling launchItem for next item
		STATE_show = 4,  // set at the end of showContent
		STATE_resize = 5,  // set in resizeHandler, resize, and mousemoveHandler when dragResizing
	// timers
		TIMER_slideshow = 1,
		TIMER_slow = 2,
		TIMER_end = 3,
		TIMER_mouseup = 4,
		TIMER_tap = 5,
		TIMER_show = 6,
		TIMER_tooltip = 7,
		TIMER_viewport = 8,
	// string indices
		STR_close = 1,
		STR_prev = 2,
		STR_next = 3,
		STR_play = 4,
		STR_pause = 5,
		STR_resize = 6,
		STR_image = 7,
		STR_page = 8,
		STR_item = 9,
		STR_info = 10,
		STR_print = 11,
		STR_open = 12,
		STR_popup = 13,
	// option settings
		OPT_none = 0,
		OPT_default = 1,
		OPT_one = 1,  // bit flags for none/either/both options
		OPT_two = 2,
		OPT_both = 3,  // OPT_one | OPT_two
	// imageTransition
		OPT_crossfade = 1,
		OPT_slide = 2,
		OPT_expand = 3,
		OPT_shift = 4,
		OPT_fade = 5,
	// resize state
		SIZE_large = 3,
		SIZE_small = 2,
		SIZE_native = 1,

	// odds and sods
		cyclers = [],
		firstEvents = [],
		resetCss = { top: '', right: '', bottom: '', left: '', width: '', height: '' },
		captionNames = [ 'caption', 'caption2', 'header', 'footer' ],
		blankGif = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==',
// 		blankGif = 'data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22/%3E',
		aboutBlank = 'about:blank',
		rexHtml = /<.+>/,
		bigNumber = 77777,  // various uses, including default base z-index
		cycleInterval = 6,  // default
		scrollbarSize,
		strings,
		icons,
		usingTouch,
		previousViewport,
		pageScrollDisabled,
		showAtLoad,

	// things set in coreInit after floatbox.js:init has run
		baseSettings,
		classSettings,
		typeSettings,
		resourcesFolder,
		waitGif,
		zoomInCursor,
		zoomOutCursor,
		contextClass,
		tooltipClass,
		cyclerClass,
		preloadLimit,

	// top window references and data to support boxes attaching there
		topView,
		topDoc,
		topData,
		topUrl,
		instances,
		items,
		popups,
		preloads,
		wrappers,
		offHints;


	function newBox ( isModal ) {
		// Box object factory.
		var
			thisBox = {},  // this
			boxIndex = instances.length,
			currentSet = [],
			activeSettings = {},
			boxEvents = [],
			itemEvents = [],
			boxTimeouts = {},  // per-box setTimer key repository
			nodeNames = [],  // keep track of created nodes for clean decommissioning
			tabRestrictions = [],  // main-page elements set to tabindex = -1
			tabIndices = [],  // captured original tabindex for tabRestrictions members
			itemsShown = 0,  // slideshow counter
			animationStatus = {},  // for monitoring boxAnimations
			animationQueue = [],  // pending synchronous boxAnimation requests
			afterAnimation,  // current animation's finish function
			topBox = getInstance(),  // the current topmost instance
			stackOrder = topBox && topBox.stackOrder + 1 || 1,
			parentBox = getInstance( undefined, true ),  // topmost modal instance
		// metrics
			movedMetrics = {  // changes to box metrics made by mousemoveHandler
				left: 0, top: 0,
				width: 0, height: 0
			},
			optionMetrics = {},  // box metrics requested through options
			requestedMetrics = {},  // net of optionMetrics and fb.resize requests
			panelHeight = {},  // fbHeader, fbTopPanel, fbBottomPanel and fbFooter heights
			nativeMargins,
			nativeWidth, nativeHeight,
			contentWidth, contentHeight,
			boxLeft, boxTop,
			boxWidth, boxHeight,
		// other
			activeItem, activeIndex,
			afterResize,
			aspect,
			attachPos,
			autoFit,
			autoFitSpace,
			boxColor,
			boxRadius,
			boxSettings,
			contentRadius,
			contentSides,
			contentSwiped,
			controlsPos,
			crossAnimate,
			crossFade,
			crossSlide,
			crossExpand,
			crossShift,
			disableBoxScroll,
			disablePageScroll,
			draggerLocation,
			enableDragMove,
			endPos,
			enableKeyboardNav,
			enableSwipeNav,
			enableWrap,
			fadeTime,
			gradientColors,
			hasCaption,
			hasCaption2,
			hasFooter,
			hasHeader,
			hasImage,
			hasInfo,
			hasItemNumber,
			hasNewWindow,
			hasPrint,
			headerSpace, footerSpace,
			imageSwap,
			imageTransition,
			indexPos,
			inFrameResize,
			innerBorder,
			innerBorderColor,
			isTooltip, isContip,
			isPaused,
			isSlideshow,
			itemCount,
			justImages,
			lockContentTop,
			maxBoxWidth, maxBoxHeight,
			maxContentWidth, maxContentHeight,
			minBoxWidth, minBoxHeight,
			minContentWidth, minContentHeight,
			navButton, navOverlay,
			numIndexLinks,
			offsetOrigin,
			outerBorder,
			outerBorderColor,
			overlayColor,
			overlayFadeTime,
			overlayOpacity,
			padding,
			panelPadding,
			prevHref, nextHref,
			prevIndex, nextIndex,
			previousItem,
			previousIndex,
			resizeable,
			resizeTime,
			resizeTool,
			shadowOpacity,
			shadowSize,
			shadowType,
			showClose,
			showHints,
			showControlsText,
			showNavOverlay,
			showPlayPause,
			sizeState,
			smallBoxSize,
			splitResize,
			startAt, endAt,
			startPos,
			startTapX, startTapY,
			startViewport,
			stickyMove, stickyResize,
			strongTextColor,
			textColor,
			transitionTime,
			zoomSource,
			// minification assistants for some box element references
			$attachTo,
			$fbContent,
			$fbContentWrapper,
			$fbFloater,
			$fbLiner,
			$fbMain,
			$fbOverlay;


		function boot ( reboot, item, startSettings ) {
			// Light up the box, called from fb.start.
			// 'reboot' if it's a sameBox restart.
			var img;

			thisBox.state = STATE_boot;

			// run and check the startup callbacks
			if ( !reboot && trigger( startSettings.beforeBoxStart ) === false
				|| trigger( startSettings.beforeItemStart, thisBox ) === false
			) {  // never mind
				if ( !reboot ) {
					destroy();
				}
			}
			else {  // proceed

				getCurrentSet( item, startSettings );  // sets activeIndex too
				if ( !itemCount ) {  // bail if we didn't find anything to show
					if ( !reboot ) {
						destroy();
					}
				}
				else {  // proceed

					isTooltip = item.isTooltip;
					isContip = item.isContip;
					previousItem = activeItem;  // undefined if this isn't a sameBox:true request
					previousIndex = activeIndex;
					thisBox.activeItem = activeItem = currentSet[ activeIndex ];
					activeSettings = startSettings;

					if ( reboot ) {
						thisBox.state = STATE_change;
					}
					else {  // configure the new box

						if ( tapInfo.type ) {
							startTapX = tapInfo.x;
							startTapY = tapInfo.y;
						}

						getBoxSettings();  // activeItem and activeSettings must already be established

						if ( parentBox ) {  // stop parent's slideshow
							parentBox.pause( true );
						}

						if ( isModal ) {
							restrictTabNav();
							// restrict touchmove panning to our own handler (removed in destroy)
							setStyle( topDoc.documentElement, 'touchAction', 'pinch-zoom' );
						}

						assembleBox();  // create and configure DOM elements
						configureBox();  // style 'em
						addEventHandlers();

						// start the overlay fade
						if ( $fbOverlay ) {
							img = boxSettings.overlayBackgroundImage;
							setStyle( $fbOverlay, {
								backgroundColor: overlayColor,
								backgroundImage: img ? 'url(' + img + ')' : '',
								visibility: '',
								opacity: 0
							} );
							boxAnimate(
								{ $: $fbOverlay, opacity: overlayOpacity },
								undefined,
								overlayFadeTime
							);
						}
						thisBox.state = STATE_start;
					}
					launchItem();
				}
			}
		}  // boot


		function getCurrentSet ( startItem, startSettings ) {
			// Populate the currentSet array with items from this group.
			var
				randomOrder = startSettings.randomOrder,
				item,
				itemSettings,
				i;

			justImages = true;
			hasImage = false;
			currentSet.length = 0;  // in case it's a samebox:reboot

			for ( i = 0; i < items.length; i++ ) {
				if ( ( item = items[ i ] ) ) {
					itemSettings = item.itemSettings;

					if ( item.canShow && (
						item == startItem
						|| item.ownerBox === true
						|| itemSettings.group
						&& itemSettings.group == startSettings.group
						&& item.hostEl
						&& nodeContains( item.hostEl.ownerDocument, item.hostEl )  // still present
					) ) {

						currentSet.push( item );  // add it to the item array for this run
						item.seen = false;  // for the slideshow counter
						item.setOrder = randomOrder ? randomInt( bigNumber )
							: itemSettings.order || currentSet.length;

						if ( item.ownerBox === true ) {  // API start
							item.ownerBox = thisBox;  // so it will clean up when this box is destroyed
							item.setOrder = -item.setOrder;  // goes to the front of the set
						}

						if ( item.isImage ) {
							hasImage = true;
						}
						else {
							justImages = false;
						}
					}
				}
			}

			itemCount = currentSet.length;
			if ( itemCount ) {  // set activeIndex (might not be startItem)
				currentSet.sort( function ( a, b ) {
					return a.setOrder - b.setOrder;
				} );
				activeIndex = randomOrder ? 0 : itemCount - 1;
				while ( activeIndex && currentSet[ activeIndex ] != startItem ) {
					activeIndex--;
				}
			}
		}  // getCurrentSet


		function getBoxSettings () {
			// Assign per box settings to this instance and tweak contingent settings.
			var
				itemSettings,
				setting,
				i;

			// activeItem and activeSettings were assigned in boot
			boxSettings = extend( activeSettings );

			enableDragMove = boxSettings.enableDragMove !== false;
			draggerLocation =
				usingTouch || !boxSettings.enableDragResize ? OPT_none
				: justImages && boxSettings.draggerLocation == 'content' ? OPT_two
				: OPT_one;  // in the frame
			boxRadius = ifNotSet( boxSettings.outerBorderRadius,
				ifNotSet( boxSettings.boxCornerRadius, 8 ) );  // legacy option name
			contentRadius = ifNotSet( boxSettings.innerBorderRadius,
				ifNotSet( boxSettings.contentCornerRadius, 0 ) );  // legacy option name
			shadowType = boxSettings.shadowType || 'drop';
			shadowSize = shadowType == 'none' ? 0 : ifNotSet( boxSettings.shadowSize, 12 );
			shadowOpacity = ifNotSet( boxSettings.shadowOpacity, 0.4 );
			outerBorder = ifNotSet( boxSettings.outerBorder, 1 );
			innerBorder = ifNotSet( boxSettings.innerBorder, 1 );
			padding = ifNotSet( boxSettings.padding, 20 );
			panelPadding = ifNotSet( boxSettings.panelPadding, 6 );
			autoFitSpace = ifNotSet( boxSettings.autoFitSpace, 5 );
			overlayOpacity = isModal ? ifNotSet( boxSettings.overlayOpacity, 0.55 ) : 0;
			transitionTime = ifNotSet( boxSettings.transitionTime, 0.8 );
			imageTransition = boxSettings.imageTransition;
			overlayFadeTime = overlayOpacity && ifNotSet( boxSettings.overlayFadeTime, 0.4 );
			resizeTime = ifNotSet( boxSettings.resizeTime, 0.7 );
			fadeTime = ifNotSet( boxSettings.fadeTime, 0.4 );
			inFrameResize = boxSettings.inFrameResize !== false;
			splitResize = resizeTime && boxSettings.splitResize;
			smallBoxSize = 120;
			showHints = boxSettings.showHints;
			stickyMove = boxSettings.stickyMove !== false;
			stickyResize = boxSettings.stickyResize !== false;
			showClose = boxSettings.showClose !== false;
			showControlsText = boxSettings.showControlsText !== false;
			enableKeyboardNav = boxSettings.enableKeyboardNav !== false;
			startAt = boxSettings.startAt;
			endAt = boxSettings.endAt;
			if ( endAt == 'start' ) {
				endAt = startAt;
			}
			// need to know zoomSource early for configureBox
			zoomSource = resizeTime && ifNotSet( activeSettings.zoomSource,
				activeItem.isImage && activeItem.boxContent
			);
			preload( zoomSource );

			// color theme definitions
			setting =
				{  // overlay, box, outerBorder, innerBorder, text, strongText
					black: [ 'black', 'black', '#888', '#ccc', '#aaa', '#ddd' ],
					blue: [ '#124', '#0b183b', '#777', '#9ab', '#aaa', '#ddd' ],
					white: [ 'black', 'white', '#555', 'black', '#555', 'black' ],
					yellow: [ '#bbb', '#ed9', '#611', '#733', '#733', '#600' ],
					red: [ '#211', '#511', '#865', '#965', '#ca8', '#eca' ]
				}[
					boxSettings.colorTheme
					|| activeItem.isImage && 'black'
					|| activeItem.isVideo && 'blue'
				]
				|| [ 'black', '#ccc', 'black', 'black', '#444', 'black' ];  // default silver

			overlayColor = boxSettings.overlayColor || setting[ 0 ];
			boxColor = boxSettings.boxColor || setting[ 1 ];
			outerBorderColor = boxSettings.outerBorderColor || setting[ 2 ];
			innerBorderColor = boxSettings.innerBorderColor || setting[ 3 ];
			textColor = boxSettings.textColor || setting[ 4 ];
			strongTextColor = boxSettings.strongTextColor || setting[ 5 ];

			// gallery settings
			if ( itemCount > 1 ) {
				setting = boxSettings.navType;  // from option ...
				setting = setting == 'none' ? OPT_none  // ... to bitmap
					: setting == 'button' ? OPT_one
					: setting == 'overlay' ? OPT_two
					: setting == 'both' ? OPT_both
					: justImages ? OPT_both
					: OPT_one;
				navButton = setting & OPT_one;
				navOverlay = setting & OPT_two;
				setting = boxSettings.showNavOverlay;
				showNavOverlay = ifNotSet( setting, usingTouch || OPT_default );
				enableSwipeNav = boxSettings.enableSwipeNav !== false;
				numIndexLinks = boxSettings.numIndexLinks;
				indexPos = boxSettings.indexPos || 'br';
				isSlideshow = boxSettings.doSlideshow;
				showPlayPause = isSlideshow && boxSettings.showPlayPause !== false;
				enableWrap = isSlideshow || boxSettings.enableWrap !== false;
				isPaused = boxSettings.startPaused;
				hasItemNumber = boxSettings.showItemNumber !== false;
			}

			// position a couple of widgets
			controlsPos =
				( showClose || showPlayPause || navButton )
				&& ( boxSettings.controlsPos || 'br' );
			resizeTool = boxSettings.resizeTool;
			resizeTool =
				resizeTool == 'topleft' || boxSettings.contentClickCloses ? OPT_two
				: resizeTool == 'both' || usingTouch ? OPT_both
				: OPT_one;  // default is cursor only

			// animation tweaks
			if ( boxSettings.doAnimations === false ) {
				resizeTime = fadeTime = transitionTime = overlayFadeTime = 0;
			}
			imageTransition = !transitionTime || imageTransition == 'none' ? OPT_none
				: imageTransition == 'slide' ? OPT_slide
				: imageTransition == 'expand' ? OPT_expand
				: imageTransition == 'shift' ? OPT_shift
				: imageTransition == 'fade' ? OPT_fade
				: OPT_crossfade;
			if ( imageTransition == OPT_none ) {
				transitionTime = 0;
			}

			// gradients are requested as a pair of boxColor values, like #112233|#aabbcc
			if ( /\|/.test( boxColor ) ) {
				gradientColors = boxColor.split( '|' );
			// average the two gradient colors for fallback
				setting = +patch( gradientColors[ 0 ], '#', '0x' );
				setting += +patch( gradientColors[ 1 ], '#', '0x');
				boxColor = '#' + ( setting / 2).toString( 16 );
			}

			// figure out what components we have in the current set
			i = itemCount;
			while ( i-- ) {
				itemSettings = currentSet[ i ].itemSettings;
				hasCaption = hasCaption || itemSettings.caption;
				hasCaption2 = hasCaption2 || itemSettings.caption2;
				hasInfo = hasInfo || itemSettings.info;
				hasPrint = hasPrint || !currentSet[ i ].isXSite && itemSettings.showPrint;
				hasNewWindow = hasNewWindow || itemSettings.showNewWindow;
				hasHeader = hasHeader || itemSettings.header;
				hasFooter = hasFooter || itemSettings.footer;
			}

			// expose some settings
			extend( thisBox, {
				outerClickCloses: ifNotSet( boxSettings.outsideClickCloses, isModal ),  // for tapHandler
				name: ( boxSettings.instanceName || activeItem.boxName ) + '',  // for fb.getInstance
				isSlideshow: isSlideshow,  // for messageHandler
				itemCount: itemCount  // for messageHandler
			} );
		}  // getBoxSettings


		function restrictTabNav () {
			// Limit (most) tab navigation to the modal box and contents.
			var i;

			tabRestrictions = fb.select( '*' );  // '*' because firefox tabs to all scrollable elements
			i = tabRestrictions.length;
			while ( i-- ) {
				tabIndices[ i ] = attr( tabRestrictions[ i ], 'tabindex' );
				attr( tabRestrictions[ i ], 'tabindex', -1 );
			}
		}  // restrictTabNav


		function assembleBox () {
			// Assemble floatbox elements roughly like the following:
			//  <img name="fbFloater" />  (initially unattached)
			//  <img name="fbSlowLoad" />  (initially unattached)
			//  <div name="fbOverlay"></div>
			//  <div name="fbMain">
			//    <div name="fbHeader"></div>
			//    <div name="fbFooter"></div>
			//    <a name="fbOuterClose"></a>
			//    <div name="fbBackground"></div>
			//    <div name="fbLiner">
			//      <div name="fbTopPanel">
			//        <span name="fbCell_tl">  (panel contents vary depending on placement options)
			//          <span name="fbCaption2"></span>
			//          <span name="fbWidgets_tl"></span>  (maybe)
			//        </span>
			//        <span name="fbCell_tc">
			//          <span name="fbWidgets_tc"></span>  (maybe)
			//        </span>
			//        <span name="fbCell_tr">
			//          <a name="fbNewWindow"></a>
			//          <span name="fbWidgets_tr"></span>  (maybe)
			//        </span>
			//      </div>
			//      <div name="fbContentWrapper">
			//        <div|img|iframe name="fbContent" />
			//        <a name="fbPrevPanel"></a>
			//        <a name="fbNextPanel"></a>
			//        <a name="fbPrev2"></a>
			//        <a name="fbNext2"></a>
			//        <span name="fbResizer"></span>
			//      </div>
			//      <div name="fbBottomPanel">
			//        <span name="fbCell_bl">  (panel contents vary depending on placement options)
			//          <span name="fbCaption"></span>
			//          <span name="fbWidgets_bl">  (maybe)
			//            <a name="fbInfo"></a>
			//            <a name="fbPrint"></a>
			//            <span name="fbItemNumber"></span>
			//          </span>
			//        </span>
			//        <span name="fbCell_bc">
			//          <span name="fbWidgets_bc"></span>  (maybe)
			//        </span>
			//        <span name="fbCell_br">
			//          <span name="fbIndex"></span>
			//          <span name="fbWidgets_br"></span>  (maybe)
			//          <span name="fbControls">
			//            <span name="fbNav">
			//              <a name="fbPrev"></a>
			//              <a name="fbNext"></a>
			//            </span>
			//            <span name="fbPlayPause">
			//              <a name="fbPlay"></a>
			//              <a name="fbPause"></a>
			//            </span>
			//            <a name="fbClose"></a>
			//          </span>
			//        </span>
			//      </div>
			//      <div name="fbDragger"></div>
			//    </div>
			//  </div>
			var
				pos,
				$fbControls,
				border;

			$fbFloater = newBoxPart( 'fbFloater', 0, 'img' );
			newBoxPart( 'fbSlowLoad', 0, 'img' );
			if ( overlayOpacity ) {
				$fbOverlay = newBoxPart( 'fbOverlay' );
			}

			$fbMain = newBoxPart( 'fbMain' );
			if ( hasHeader ) {
				newBoxPart( 'fbHeader', $fbMain );
			}
			if ( hasFooter ) {
				newBoxPart( 'fbFooter', $fbMain );
			}
			if ( boxSettings.showOuterClose ) {
				newBoxPart( 'fbOuterClose', $fbMain, 'a', STR_close, 'close2' );
			}

			newBoxPart( 'fbBackground', $fbMain );
			$fbLiner = newBoxPart( 'fbLiner', $fbMain );

			$attachTo = newBoxPart( 'fbTopPanel', $fbLiner );
			newBoxPart( 'fbCell_tl', $attachTo, 'span' );
			newBoxPart( 'fbCell_tc', $attachTo, 'span' );
			newBoxPart( 'fbCell_tr', $attachTo, 'span' );

			$fbContentWrapper = newBoxPart( 'fbContentWrapper', $fbLiner );

			if ( navOverlay ) {
				newBoxPart( 'fbPrevPanel', $fbContentWrapper, 'a' );
				newBoxPart( 'fbNextPanel', $fbContentWrapper, 'a' );
				newBoxPart( 'fbPrev2', $fbContentWrapper, 'a', STR_prev, 'prev2' );
				newBoxPart( 'fbNext2', $fbContentWrapper, 'a', STR_next, 'next2' );
			}

			if ( hasImage ) {
				newBoxPart( 'fbResizer', $fbContentWrapper, 'span', STR_resize, 'zoom' );
			}

			$attachTo = newBoxPart( 'fbBottomPanel', $fbLiner );
			newBoxPart( 'fbCell_bl', $attachTo, 'span' );
			newBoxPart( 'fbCell_bc', $attachTo, 'span' );
			newBoxPart( 'fbCell_br', $attachTo, 'span' );

			// indexLinks are next to fbContent when in bottom panel, re-ordered below when in the top
			if ( numIndexLinks ) {
				newBoxPart( 'fbIndex', thisBox[ 'fbCell_' + indexPos ], 'span' );
			}

			if ( controlsPos ) {
				$fbControls = newBoxPart( 'fbControls', thisBox[ 'fbCell_' + controlsPos ], 'span' );
				if ( navButton ) {
					$attachTo = newBoxPart( 'fbNav',
						boxSettings.centerNav
							? thisBox[ 'fbCell_' + patch( controlsPos, /[lr]/, 'c' ) ]
							: $fbControls,
						'span'
					);
					pos = smallScreen && !showControlsText? 3 : '';
					newBoxPart( 'fbPrev', $attachTo, 'a', STR_prev, 'prev' + pos, 'Right' );
					newBoxPart( 'fbNext', $attachTo, 'a', STR_next, 'next' + pos, 'Left' );
				}
				if ( showPlayPause ) {
					$attachTo = newBoxPart( 'fbPlayPause', $fbControls, 'span' );
					newBoxPart( 'fbPlay', $attachTo, 'a', STR_play, 'play', 'Left' );
					newBoxPart( 'fbPause', $attachTo, 'a', STR_pause, 'pause', 'Left' );
				}
				if ( showClose ) {
					newBoxPart( 'fbClose',
						$fbControls,
						'a',
						STR_close,
						showControlsText ? 'close' : 'close3',
						'Left'
					);
				}
			}

			if ( hasCaption2 ) {
				newBoxPart( 'fbCaption2',
					thisBox[ 'fbCell_' + ( boxSettings.caption2Pos || 'tc' ) ],
					'span'
				);
			}
			if ( hasCaption ) {
				newBoxPart( 'fbCaption',
					thisBox[ 'fbCell_' + ( boxSettings.captionPos || 'bl' ) ],
					'span'
				);
			}
			if ( hasInfo ) {
				pos = boxSettings.infoLinkPos || 'bl';
				newBoxPart( 'fbInfo',
					newBoxPart( 'fbWidgets_' + pos,
						thisBox[ 'fbCell_' + pos ],
						'span'
					),
					'a',
					0,
					'info',
					'Right'
				);
			}
			if ( hasPrint ) {
				pos = boxSettings.printLinkPos || 'bl';
				newBoxPart( 'fbPrint',
					thisBox[ 'fbWidgets_' + pos ] || newBoxPart( 'fbWidgets_' + pos,
						thisBox[ 'fbCell_' + pos ],
						'span'
					),
					'a',
					0,
					'print',
					'Right'
				);
			}
			if ( hasItemNumber ) {
				pos = boxSettings.itemNumberPos || 'bl';
				newBoxPart( 'fbItemNumber',
					thisBox[ 'fbWidgets_' + pos ] || newBoxPart( 'fbWidgets_' + pos,
						thisBox[ 'fbCell_' + pos ],
						'span'
					),
					'span'
				);
			}
			if ( hasNewWindow ) {
				pos = boxSettings.newWindowLinkPos || 'tr';
				newBoxPart( 'fbNewWindow',
					thisBox[ 'fbWidgets_' + pos ] || newBoxPart( 'fbWidgets_' + pos,
						thisBox[ 'fbCell_' + pos ],
						'span'
					),
					'a',
					0,
					'newWindow',
					'Right'
				);
			}
			if ( draggerLocation ) {
				newBoxPart( 'fbDragger',
					draggerLocation == OPT_one ? $fbLiner : $fbContentWrapper,
					'div',
					0,
					'dragger'
				);
			}

			// re-order controls if on the left and move to the bottom if in the bottom panel
			if ( /l/.test( controlsPos ) ) {
				placeElement( thisBox.fbPlayPause, $fbControls );
				placeElement( thisBox.fbNav, $fbControls );
			}
			if ( /b/.test( controlsPos ) ) {
				placeElement( $fbControls, $fbControls.parentElement );
			}

			// place top panel index links closest to content
			if ( numIndexLinks && /t/.test( indexPos ) ) {
				placeElement( thisBox.fbIndex, thisBox.fbIndex.parentElement );
			}

			// attach to requested node or bottom of the body
			$attachTo = $( boxSettings.attachTo, document );
			if ( !$attachTo || !$attachTo.offsetParent ) {
				$attachTo = document.body;
			}
			setStyle( [ $fbOverlay, $fbMain ], 'visibility', 'hidden' );
			placeElement( $fbOverlay, $attachTo );
			placeElement( $fbMain, $attachTo );

			// doc coords of offsetParent's top/left
			if ( $attachTo == document.body ) {
				attachPos = { left: 0, top: 0 };
			}
			else {
				attachPos = getRect( $fbMain.offsetParent );
				border = getStyle( $fbMain.offsetParent, 'border' );
				attachPos = {
					left: attachPos.left + border.left + viewport.left,
					top: attachPos.top + border.top + viewport.top
				};
			}
			offsetOrigin = {  // screen to doc coord deltas
				left: viewport.left - attachPos.left,
				top: viewport.top - attachPos.top
			};

		}  // assembleBox

		function newBoxPart ( fbName, $parentEl, tagName, title, icon, iconTextSide ) {
			// Create a box element.
			var $el;

			if ( fbName ) {
				$el = thisBox[ fbName ] = newElement( tagName || 'div' );

				title = title && strings[ title ] || '';  // needed for icon control text too
				if ( title
					&& enableKeyboardNav
					&& showHints !== false
					&& !offHints[ fbName ]
				) {
					$el.title = title;
				}

				if ( icon ) {
					icon = newElement( 'i', icons[ icon ] );
					addClass( icon, 'fbIcon' );

					if ( iconTextSide ) {  // there is, or will be, text on this control or widget
						$el.innerHTML = makeOuterHtml( 'span',
							// first word of title string
							showControlsText ? /\S*/.exec( title )[ 0 ] : '',
							[ 'class', 'fbText' ]
						);
						setStyle( icon, 'padding' + iconTextSide, '.5em' );  // add padding on text side
					}
					placeElement( icon, $el, iconTextSide == 'Right' && $el.firstChild );
					boxEvents.push(
						addEvent( $el, [ 'mouseover', 'mouseout' ], highlightHandler )
					);
					setStyle( $el, 'color', textColor );
				}

				$el.fbName = fbName;
				addClass( $el, [
					'fbx',
					fbName,
					/_/.test( fbName ) && fbName.split( '_' )[ 0 ]  // fbCell_* gets the fbCell class
				] );

				// <a>
				if ( tagName == 'a' ) {
					$el.href = '';  // needs href to be tappable on mobile devices
					boxEvents.push(
						addEvent( $el, 'click', stopEvent )  // prevent default link navigation
					);
				}

				// <iframe>
				if ( tagName == 'iframe' ) {
					attr( $el, {
						allowFullScreen: '', // html5 full-screen mode (not case-sensitive)
						allow: 'autoplay',  // avoid muted video requirement for autoplay
						// frameBorder is deprecated but can't hurt and might help
						frameBorder: 0
					} );

					$el.src = aboutBlank;  // code can check src value to see if the iframe is live yet
				}

				// <img>
				if ( tagName == 'img' ) {
					$el.alt = '';  // 508 compliance, to be added later
					$el.src = blankGif;  // else firefox might show a brief broken icon
				}

				// add element references to box and fb
				thisBox[ fbName ] = $el;
				nodeNames.push( fbName );  // keep a record of created nodes for destroy

				if ( $parentEl ) {
					placeElement( $el, $parentEl );
				}

				return $el;
			}
		}  // newBoxPart


		function configureBox () {
			// Set initial state for various box bits.
			var
				$fbOuterClose = thisBox.fbOuterClose,
				setting,
				val;

			setStyle( [
					$fbOuterClose,
					$fbLiner,
					thisBox.fbControls,
					thisBox.fbHeader,
					thisBox.fbFooter
				],
				'visibility', 'hidden'
			);

			// color and background requests
			// (icon'd widget color was set at newBoxPart creation time)

			// take care of captions, info and print via inheritance from the panels
			setStyle( [
					thisBox.fbTopPanel,
					thisBox.fbBottomPanel
				],
				'color', strongTextColor
			);
			setStyle( [
					thisBox.fbItemNumber,
					thisBox.fbNewWindow
				],
				'color', textColor
			);
			setStyle( $fbMain, 'borderColor', outerBorderColor );
			setStyle( $fbContentWrapper, 'borderColor', innerBorderColor );

			setting = boxSettings.boxBackgroundImage;

			setStyle( thisBox.fbBackground, {
				backgroundColor: boxColor,
				backgroundImage: setting ? 'url(' + setting + ')'
					: gradientColors ? 'linear-gradient(' + gradientColors.join( ',' ) + ')'
					: ''
			} );

			// misc element styles

			startPos = getAnimationOrigin( startAt );
			setStyle( $fbMain, extend( {
					borderWidth: 0  // outerBorder will get assigned by opening animations
				}, startPos )
			);

			setStyle( $fbContentWrapper, 'borderWidth', innerBorder );

			if ( $fbOuterClose ) {

				if ( boxSettings.detachOuterClose ) {
					setStyle( $fbOuterClose, 'position', 'fixed' );
					val = autoFitSpace;
				}
				else {
					val = getRect( $fbOuterClose ).width / -2 - outerBorder;
				}

				setStyle( $fbOuterClose, {
					top: val,
					left: val,
					right: val
				} );
				setStyle( $fbOuterClose,
					boxSettings.outerClosePos == 'tl' ? 'right' : 'left',
					''
				);
				setStyle( select( 'circle', $fbOuterClose, 0 ), 'fill', boxColor );
			}

			if ( showPlayPause ) {
				setStyle( [
						thisBox.fbPlay,
						thisBox.fbPause
					],
					'width', mathMax(  // lock the largest width
						getStyle( thisBox.fbPlay, 'width', true ),
						getStyle( thisBox.fbPause, 'width', true )
					)
				);
				setStyle( thisBox[ isPaused ? 'fbPause' : 'fbPlay' ],  // hide one of 'em
					'display', 'none'
				);
			}

			// round corners
			if ( boxRadius ) {
				setBorderRadius( $fbMain, boxRadius, '', outerBorder );
			}
			if ( contentRadius ) {
				setBorderRadius( $fbContentWrapper, contentRadius );
			}

			// stack 'em
			setZIndex();

			// setup fbFloater here, not in appear, so it can be above the overlay
			if ( zoomSource ) {
				popups.locked = true;  // so we can zoom from an open fbPop
				setStyle( $fbFloater, startPos );
				$fbFloater.src = activeItem.thumbSrc || blankGif;  // zoomSource might be preloading
				placeElement( $fbFloater, $attachTo );
			}
		}  // configureBox


		function addEventHandlers () {
			// Add event handlers to the box components.

			// keyboard handler is not per box and stays in play as long as any box is open
			if ( !boxIndex ) {
				firstEvents.push(  // will be removed with the last box
					addEvent( topDoc, 'keydown', keydownHandler )
				);
			}

			boxEvents.push(

				// click actions for all widgets
				// drag for box moves and resizes
				// in-frame-resized moves, swipe nav, and restacking for multiple non-modal boxes
				addEvent( $fbMain, [ 'touchstart', 'mousedown' ], getMousedownHandler() ),

				// highlighter didn't get assigned to the nav panels in newBoxPart
				// because they don't have an fbIcon child
				addEvent( [ thisBox.fbPrevPanel, thisBox.fbNextPanel ],
					[ 'mouseover', 'mouseout' ],
					highlightHandler
				),

				// can't use the mouseHandler for newWindow because firefox on android
				// will block it if called from fbMain's touchend
				addEvent( thisBox.fbNewWindow, 'click', newWindowHandler ),

				// put handler on tooltip boxes so that mouse events on it behave similarly
				// to mouse events on the host element
				isTooltip && addEvent( $fbMain, [ 'mouseover', 'mouseout' ], contipHandler )
			);

		}  // addEventHandlers


		function keydownHandler ( e ) {
			var
				keyCode = e.keyCode,
				modKey = e.ctrlKey || e.shiftKey || e.altKey || e.metaKey,
				topBox = getInstance();

			if ( modKey && ( keyCode == 38 || keyCode == 40 ) ) {
				// can use any modkey with up/dn arrows instead of pgup/dn
				// useful for devices such as smaller macs with no pgup/dn keys
				keyCode = keyCode == 38 ? 33 : 34;
				modKey = false;
			}

			// process keystrokes in the context of the top-most box
			if ( thisBox != topBox ) {
				if ( topBox && topBox.state ) {
					topBox.keydownHandler( e );
				}
			}

			else if ( enableKeyboardNav
				&& thisBox.state
				&& !modKey
				&& getOwnerView( self )  // has thrown while browser is navigating away
				&& !getTagName( e.target, [ 'input', 'select', 'textarea' ] )
			) {

				// left/right arrow: prev/next item
				if ( ( keyCode == 37 || keyCode == 39 ) && itemCount > 1 ) {
					stopEvent( e );
					showItem( keyCode == 37 ? 'prev' : 'next' );
				}

				// spacebar: toggle play/pause
				else if ( keyCode == 32 && isSlideshow && activeItem.isImage ) {
					stopEvent( e );
					pause( !isPaused );
				}

				// pgup pgdn: resize up or down
				else if ( ( keyCode == 33 || keyCode == 34 ) && resizeable ) {
					stopEvent( e );
					resizeHandler( keyCode == 33 ? SIZE_large : SIZE_small );
				}

				// enter: accessible keyboard click
				else if ( keyCode == 13 ) {
					boxHandler( e );  // will stop e if appropriate
				}

				// esc: exit
				else if ( keyCode == 27 ) {
					stopEvent( e );
					end();  // top-most
				}
			}
		}  // keydownHandler


		function getMousedownHandler () {
			// touch/click/drag handler for all box components.
			// Wraps some closure vars around mousedown, mousemove, mouseup, and touch handlers.
			var
				eventQueue = [],
				touches, evt,
				$target, $docEl,
				$bodStyle, bodCursor,
				startX, startY,
				contentRect,
				dx, dy,
				dragMoving, dragResizing,
				origin,
				isZoomed,
				inFrameDrag,
				swiping,
				moved,
				allowDefault,
				fbName,
				sum,
				scaled;

			return function ( e ) {
				// The real mousedown handler.

				if ( thisBox.state == STATE_show
					&& ( usingTouch || !e.button )  // left-button is 0
				) {

					// capture some shared data
					touches = e.touches;
					evt = touches ? touches[ 0 ] : e;
					$target = evt.target;
					fbName = $target.fbName || '';
					$docEl = $target.ownerDocument.documentElement;
					$bodStyle = topDoc.body.style;
					bodCursor = $bodStyle.cursor;
					startX = evt.clientX;
					startY = evt.clientY;
					origin = getStyle( $fbMain, 'position' ) == 'fixed' ? visualOrigin : offsetOrigin;
					isZoomed = zoomedContent();
					contentRect = getRect( $fbContent );  // maybe in-frame-resized position
					contentRect.left -= boxLeft + outerBorder + padding + innerBorder;  // to offsets
					contentRect.top -= boxTop + outerBorder + panelHeight.fbTopPanel + innerBorder;
					// .x and .y are the proportion of oversize currently taken up by -ve left and top
					contentRect.x = contentRect.left / ( contentWidth - contentRect.width );
					contentRect.y = contentRect.top / ( contentHeight - contentRect.height );

					// always need the mouseup handler to check for click actions
					eventQueue.push( addEvent( $docEl,
						touches ? 'touchend' : 'mouseup',
						mouseupHandler
					) );

					// don't let iframe content consume mouse events while mouse is down
					if ( activeItem.isIframe ) {
						setStyle( $fbContent, 'pointerEvents', 'none' );
					}

					// restack the clicked box to the top of the pile
					if ( !isModal && !isContip && fbName != 'fbHeader' && fbName != 'fbFooter' ) {
						restack();
					}

					// see if we want to monitor mouse moves for any reason
					inFrameDrag = swiping = contentSwiped = dragResizing = dragMoving = moved = false;

					// resize dragger (must come before drag move and content checks)
					if ( nodeContains( thisBox.fbDragger, $target ) ) {
						$bodStyle.cursor = 'nw-resize';
						dragResizing = true;
					}

					// actions on content
					else if ( nodeContains( $fbContentWrapper, $target ) ) {

						if ( zoomedContent() ) {
							// image (or iOS HTML) is currently scaled up inside fbContentWrapper
							inFrameDrag = true;
						}
						else if ( activeItem.isImage ) {
							// swipe navigation for touch and box moving for mouse
							if ( touches && enableSwipeNav ) {
								swiping = true;
							}
							else {
								dragMoving = enableDragMove;
							}
						}
					}

					// drag move on box elements
					else if ( enableDragMove
						&& /^fb/.test( fbName )  // leave the mouse alone for elements inside captions
						&& !nodeContains( thisBox.fbHeader, $target )
						&& !nodeContains( thisBox.fbFooter, $target )
						&& !getTagName( $target, 'object' )
							// plugins on the mac are (were?) propagating mouse actions
					) {
						dragMoving = true;
					}

					if ( inFrameDrag || swiping || dragResizing || dragMoving ) {

						// preventDefault
						stopEvent( e );

						// register move handler
						eventQueue.push( addEvent( $docEl,
							touches ? 'touchmove' : 'mousemove',
							mousemoveHandler,
							touches && { passive: false }
						) );
					}
				}
			};  // mousedownHandler

			function mousemoveHandler ( e ) {
				touches = e.touches;
				evt = touches ? touches[ 0 ] : e;
				allowDefault = touches && touches[ 1 ]  // ignore multi-touch
					|| evt.target.ownerDocument != topDoc;  // or in an iframe document

				if ( e.buttons === 0 ) {  // mouseup happened outside of browser window
					mouseupHandler();
				}

				else if ( thisBox.state && $fbMain && !allowDefault ) {
					dx = evt.clientX - startX;  // current distance from the clicked location
					dy = evt.clientY - startY;

					if ( !moved && dx * dx + dy * dy > 9 ) {
						moved = true;
						tapHandler();  // so mouseup won't trigger actions
						clearTimer( TIMER_slideshow, boxTimeouts );  // suspend slideshow activity
					}

					if ( moved ) {

						if ( inFrameDrag ) {  // move the in-frame-resized image
							setStyle( $fbContent, {
								left: mathMax(
									mathMin( contentRect.left + dx, 0 ),
									contentWidth - contentRect.width
								),
								top: mathMax(
									mathMin( contentRect.top + dy, 0 ),
									contentHeight - contentRect.height
								)
							} );
						}

						else if ( swiping ) {
							if ( !contentSwiped && mathAbs( dx ) > 50 ) {
								contentSwiped = true;
								mouseupHandler();
								showItem( dx > 0 ? 'prev' : 'next' );
							}
						}

						else if ( dragMoving ) {
							// move the box
							setStyle( $fbMain, {
								left: boxLeft + origin.left + dx,
								top: boxTop + origin.top + dy
							} );
						}

						else if ( dragResizing ) {

							// initialize on first handled move event
							if ( thisBox.state != STATE_resize ) {
								thisBox.state = STATE_resize;
								collapse();
							}

							// allocate mouse move deltas proportionately
							if ( aspect ) {
								sum = dx + dy;
								dy = sum / ( aspect + 1 );
								dx = sum - dy;  // the new dy
							}

							// enforce maxWidth/Height
							scaled = scale(
								contentWidth + dx * 2, contentHeight + dy * 2,
								maxContentWidth, maxContentHeight,
								aspect, false, -1
							);

							// and minWidth/Height
							scaled = scale(
								scaled.width, scaled.height,
								minContentWidth, minContentHeight,
								aspect, true, 1
							);

							dx = ( scaled.width - contentWidth ) / 2;
							dy = ( scaled.height - contentHeight ) / 2;

							// resize the box
							setStyle( $fbMain, {
								left: boxLeft + offsetOrigin.left - dx,
								top: boxTop + offsetOrigin.top - dy,
								width: boxWidth + ( dx - outerBorder ) * 2,
								height: boxHeight + ( dy - outerBorder ) * 2
							} );

							// reposition in-frame-resized images
							if ( isZoomed ) {

								if ( $fbContentWrapper.clientWidth < contentRect.width ) {
									setStyle( $fbContent, {
										left: mathMin( 0, contentRect.left + dx * 2 * contentRect.x ),
										top: mathMin( 0, contentRect.top + dy * 2 * contentRect.y )
									} );
								}

								else {
									isZoomed = false;
									setStyle( $fbContent, resetCss );
								}
							}

						}  // dragResizing

						else {
							allowDefault = true;
						}
					}

					if ( !allowDefault ) {
						stopEvent( e );
						// firefox can select document text when mouse moves occur outside of the target
						topView.getSelection().removeAllRanges();
					}

					// consider absence of movement a mouseup event
					// cancel the old and set a new one on each mousemove
					setTimer( mouseupHandler, 1777, TIMER_mouseup, boxTimeouts );
				}
			}  // mousemoveHandler

			function mouseupHandler ( e ) {

				clearTimer( TIMER_mouseup, boxTimeouts );  // cancel the inactivity timer
				removeEvent( eventQueue );  // unregister the event handlers
				$bodStyle.cursor = bodCursor;
				setStyle( $fbContent, 'pointerEvents' );  // was set only on iframes

				if ( thisBox.state ) {

					if ( moved ) {

						if ( dragResizing ) {
							boxLeft -= dx;
							boxTop -= dy;
							contentWidth += dx * 2;
							contentHeight += dy * 2;
							movedMetrics.width += dx * 2;
							movedMetrics.height += dy * 2;
							lockContentTop = getRect( $fbContentWrapper ).top;
							paintBox( false, 0 );
							postResize();
						}

						else if ( dragMoving ) {
							boxLeft += dx;
							boxTop += dy;
							movedMetrics.left += dx;
							movedMetrics.top += dy;
						}
					}

					else if ( e ) {  // and not moved

						// focus fbMain to help the keyboard handler close with 'esc'
						if ( activeItem.isIframe && hasClass ( e.target, 'fbx' ) ) {
							attr( $fbMain, 'tabindex', 0 );
							$fbMain.focus();
						}

						// check for click actions to be handled
						if ( tapInfo.type ) {
							boxHandler( e );  // will stop e if appropriate
						}
					}
				}
			}  // mouseupHandler

		}  // getMousedownHandler


		function highlightHandler ( e ) {
			// mouseover/out highlighting for various widgets.
			var
				$this = this,
				panelPairs = {
					fbPrevPanel: 'fbPrev2',
					fbNextPanel: 'fbNext2'
				},
				actionPairs = {
					fbClose: 'fbOuterClose',
					fbOuterClose: 'fbClose',
					fbPrev2: 'fbPrev',
					fbNext2: 'fbNext',
					fbPrev: 'fbPrev2',
					fbNext: 'fbNext2'
				},
				fbName = $this.fbName || '',
				fbName2 = panelPairs[ fbName ],
				related = e.relatedTarget,
				on = e.type == 'mouseover';

			// ignore mouseouts when going from the nav panels to the associated nav widgets
			if ( on || !( fbName2 && related && fbName2 == related.fbName ) ) {

				// overlay nav and resizer
				if ( nodeContains( $fbContentWrapper, $this ) ) {

					// toggle opacity for content widgets that show something ( not for nav panels )
					if ( $this.innerHTML ) {
						// save prior values
						$this.opacity = $this.opacity || getStyle( $this, 'opacity', true );
						setStyle( $this, 'opacity', on ? 0.8 : $this.opacity );
					}

					if ( $this.href ) {  // fbResizer is a span

						// hide/reveal nav2 widgets on mouse hover
						if ( showNavOverlay === OPT_default ) {
							setStyle( thisBox[ fbName2 ], 'visibility',
								on || !activeItem.isImage ? '' : 'hidden'
							);
						}

						// highlight nav1 widgets below
						$this = thisBox[ actionPairs[ fbName2 ] ];
					}

					else {
						$this = undefined;
					}
				}

				// text highlighting for icon fonts and various widget links
				if ( $this ) {

					on = $this.href && on;
					setStyle( $this, 'color',
						on ? strongTextColor : textColor
					);
					setStyle( select( '.fbText', $this, 0 ), 'textDecoration',
						on ? 'underline' : ''
					);
				}

				// maybe remove title attributes to turn off the system tooltip keyboard nav hints
				if ( on && fbName && thisBox[ fbName ].title && showHints !== true ) {

					setTimer( function () {
							fbName2 = actionPairs[ fbName ] || fbName;
							offHints[ fbName ] = offHints[ fbName2 ] = true;
							attr( [ thisBox[ fbName ], thisBox[ fbName2 ] ], 'title', null );
						},
						1777, fbName, boxTimeouts
					);
				}

				else {
					clearTimer( fbName, boxTimeouts );
				}
			}
		}  // highlightHandler


		function newWindowHandler ( e ) {
			// handle newWindow link clicks in a way that makes android firefox happy
			var view = getOwnerView( $fbContent.contentWindow );

			if ( tapInfo.type
				&& newWindow( view && view.location.href
					|| $fbContent.src != aboutBlank && $fbContent.src
					|| this.href
				)
				&& activeSettings.closeOnNewWindow
			) {
				end();
			}
			stopEvent( e );
		}  // newWindowHandler


		function boxHandler ( e ) {
			// fbMain.onclick replacement for touchend, mouseup and enter key.
			var
				$target = e.target,
				handled = true,  // a starting assumption
				fbName;

			if ( $target && tapInfo.type && ( !usingTouch || e.type != 'mouseup' ) ) {

				if ( !$target.fbName && !getTagName( $target, 'a' ) ) {  // <a> for index links
					$target = $target.parentElement || $target;
				}
				fbName = $target.fbName || '';

				if ( /fbPrev/.test( fbName ) ) {  // includes fbPrev2
					showItem( 'prev' );
				}

				else if ( /fbNext/.test( fbName ) ) {
					showItem( 'next' );
				}

				else if ( fbName == 'fbPlay' ) {
					pause( false );
				}

				else if ( fbName == 'fbPause' ) {
					pause( true );
				}

				else if ( resizeable &&
					( fbName == 'fbResizer' || fbName == 'fbContent' && $target.style.cursor )
				) {
					resizeHandler( e );
				}

				else if ( fbName == 'fbInfo' ) {
					start( thisBox.fbInfo );
				}

				else if ( fbName == 'fbPrint' ) {
					printNode( $fbContent, activeSettings.printCSS, activeSettings );
				}

				else if (  // must check the overlay nav and resizer before this
					/Close/.test( fbName )
					|| activeSettings.contentClickCloses
					&& nodeContains( $fbContentWrapper, $target )
				) {
					end();
				}

				else {
					handled = false;  // don't cancel the event if it wasn't handled
				}

				if ( handled ) {
					stopEvent( e );
				}
			}
		}  // boxHandler


		function resizeHandler ( e ) {
			// Image resize request from fbResizer, content click, or PgUp/Dn keys.
			var
				rect,
				done;

			if ( sizeState != SIZE_native	&& sizeState != e ) {
				// e for keyboard handler to request sizeing up or down

				clearTimer( TIMER_slideshow, boxTimeouts );  // suspend slideshow activity

				// currently reduced
				if ( sizeState == SIZE_small ) {

					if ( inFrameResize && autoFit ) {  // enlarge to nativeSize

						rect = getRect( $fbContent );

						if ( e.target == $fbContent && tapInfo.type ) {
							// use the click point as the expand center
							rect.x = tapInfo.x;
							rect.y = tapInfo.y;
						}

						boxAnimate(
							{ $: $fbContent,
								left: ( rect.x - rect.left ) * ( 1 - nativeWidth / rect.width ),
								top: ( rect.y - rect.top ) * ( 1 - nativeHeight / rect.height ),
								width: nativeWidth,
								height: nativeHeight
							},
							postResize,
							resizeTime
						);

						done = true;
					}
				}

				else {  // sizeState == SIZE_large
					done = zoomedContent( postResize );
				}

				// resize to original request, auto-fitting as appropriate
				if ( !done ) {
					thisBox.state = STATE_resize;
					movedMetrics = { left: 0, top: 0, width: 0, height: 0 };
					calcContentMetrics( [  // showContent will call postResize
						collapse, [
							paintBox, sizeState == SIZE_large
						]
					] );
				}
			}
		}  // resizeHandler


		function showItem ( newIndex ) {
			// Called by prev/next events, pause, index links, slideshow timer, or external code.
			// 'reload' allows refresh of currently showing activeItem.
			// undefined advances a slideshow.
			var
				newItem,
				newSettings,
				after,
				i;

			if ( thisBox.state == STATE_show ) {

				// slideshow advancement or end
				if( newIndex === undefined ) {

					if ( isSlideshow ) {

						after = boxSettings.afterSlideshow;

						if ( itemsShown < itemCount || after == 'loop' ) {
							if ( !isPaused && !document.hidden ) {
								showItem( nextIndex );
							}
						}

						else if ( after == 'stop' ) {
							pause( true );
							i = itemCount;
							while ( i-- ) {
								currentSet[ i ].seen = false;
							}
							itemsShown = 0;
						}

						else {  // default is 'exit'
							end();
						}
					}
				}

				// show requested item
				else {

					newIndex =
						newIndex == activeIndex ? undefined :
						newIndex == 'prev' ? prevIndex :
						newIndex == 'next' ? nextIndex :
						newIndex == 'reload' ? activeIndex :
						+newIndex;

					if ( ( newItem = currentSet[ newIndex ] ) ) {
						newSettings = extend( newItem.itemSettings );

						if (
							trigger( activeSettings.beforeItemEnd, thisBox ) !== false
							&& trigger( newSettings.beforeItemStart, thisBox ) !== false
						) {


							previousItem = activeItem;
							previousIndex = activeIndex;
							activeItem = thisBox.activeItem = newItem;
							activeIndex = newIndex;
							activeSettings = newSettings;

							clearTimer( TIMER_slideshow, boxTimeouts );
							thisBox.state = STATE_change;
							launchItem();
						}
					}
				}
			}
		}  // showItem


		function launchItem () {
			// Determine some activeItem state details and proceed to fetch, measure and show item.
			var setting;

			try {
				document.activeElement.blur();
			}
			catch ( _ ) { }

			viewportHandler();

			// aspect ratio request
			aspect = activeSettings.aspect;
			if ( /%w/.test( activeSettings.height ) ) {  // legacy
				aspect = aspect || 100 / getFloat( activeSettings.height );
				activeSettings.height = undefined;
			}
			aspect = aspect || 0;

			// get metrics requests from the options
			optionMetrics = {
				left: ifNotSet( activeSettings.boxLeft, boxSettings.boxLeft ),
				top: ifNotSet( activeSettings.boxTop, boxSettings.boxTop ),
				width: activeSettings.width,
				height: activeSettings.height
			};
			if ( optionMetrics.left == 'click' ) {
				optionMetrics.left = startTapX;
			}
			if ( optionMetrics.top == 'click' ) {
				optionMetrics.top = startTapY;
			}

			// max & min width & height
			// max/minContentWidth/Height options are legacy
			maxContentWidth = resolvePercent(
				activeSettings.maxWidth || activeSettings.maxContentWidth,
				viewport.width,
				bigNumber
			);
			maxContentHeight = resolvePercent(
				activeSettings.maxHeight || activeSettings.maxContentHeight,
				viewport.height,
				bigNumber
			);

			minContentWidth = mathMin( maxContentWidth,  // min must be < max
				resolvePercent(
					activeSettings.minWidth || activeSettings.minContentWidth,
					viewport.width,
					isContip ? 35 : activeItem.isMedia ? 140 : 70
				)
			);
			minContentHeight = mathMin( maxContentHeight,
				resolvePercent(
					activeSettings.minHeight || activeSettings.minContentHeight,
					viewport.height,
					isContip ? 25 : activeItem.isMedia ? 100 : 50
				)
			);

			// autoFit, scrollable and resizeable
			autoFit = activeSettings.autoFit !== false;
			resizeable = activeItem.isImage && activeSettings.enableImageResize !== false;

			setting = boxSettings.pageScroll;
			disablePageScroll = !!setting === setting
				? !setting
				: isModal && autoFit;

			setting = boxSettings.boxScroll;
			disableBoxScroll = !!setting === setting
				? !setting
				: disablePageScroll || undefined;

			// animated transitions between gallery set images
			crossAnimate = crossFade = crossSlide = crossExpand = crossShift = false;
			imageSwap = thisBox.state == STATE_change
				&& previousItem.isImage
				&& activeItem.isImage;
			if ( imageSwap && transitionTime ) {
				if ( contentSwiped ) {
					crossShift = true;
				}
				else {
					crossFade = imageTransition == OPT_crossfade;
					crossSlide = imageTransition == OPT_slide;
					crossExpand = imageTransition == OPT_expand;
					crossShift = imageTransition == OPT_shift;
				}
				crossAnimate = crossFade || crossSlide || crossExpand || crossShift;
			}

			// reset various box metrics
			boxLeft = boxTop = contentWidth = contentHeight = nativeWidth = nativeHeight = undefined;
			requestedMetrics = extend( optionMetrics );
			if ( !stickyMove ) {
				movedMetrics.left = movedMetrics.top = 0;
			}
			if ( !stickyResize ) {
				movedMetrics.width = movedMetrics.height = 0;
			}

			setTimer( slowLoader, 1777, TIMER_slow, boxTimeouts );
			collapse ( [ fetchContent, [ calcContentMetrics, setPanelContent ] ] );
		}  // launchItem

		function slowLoader () {
			var
				$fbSlowLoad = thisBox.fbSlowLoad,
				gif = preloads[ waitGif ];

			setStyle( $fbSlowLoad, {
				left: viewport.left - gif.width / 2
					+ ( startTapX || viewport.width / 2 ),
				top: viewport.top - gif.height / 2
					+ ( startTapY || viewport.height / 2 ),
				zIndex: +$fbMain.style.zIndex + 77
			} );

			$fbSlowLoad.src = gif.src;
			placeElement( $fbSlowLoad, document.body );
		}  // slowLoader


		function collapse ( then, phase ) {
			// Preps floatbox bits for content and/or size changes.

			if ( !phase ) {

				// cancel pending timeouts
				clearTimer( TIMER_end, boxTimeouts );  // cancel a pending autoEnd timer
				clearTimer( TIMER_slideshow, boxTimeouts );  // slideshow auto-advance

				postResize( true );  // remove resizer, navOverlay and useMap
				popupHideAll();  // close index link popup thumbs

				// always animate with fbMain in position:absolute
				setFixedPos( false );

				if ( crossAnimate || thisBox.state == STATE_resize ) {
					// hide the panels
					setStyle( [ thisBox.fbTopPanel, thisBox.fbBottomPanel ],
						'visibility', 'hidden'
					);
					phase = 1;  // fall through for crossAnimate
				}

				else {
					removeEvent( itemEvents );
					// set boxLiner (or box for tooltips) opacity, maybe animated
					boxAnimate( {
							$: isContip ? $fbMain : $fbLiner,
							opacity: 0
						},
						[ collapse, then, 1 ],
						thisBox.state == STATE_start ? 0 : transitionTime && fadeTime
					);
				}
			}  // end phase 0

			if ( phase == 1 ) {
				// Put inline content and captions back, cleanup video, run afterItemEnd.
				var
					item = thisBox.state == STATE_change ? previousItem
						: thisBox.state == STATE_end ? activeItem
						: null,
					name,
					setting,
					fbName,
					$fbNode,
					i;

				if ( item ) {

					// move inline captions back to the host page
					i = captionNames.length;
					while ( i-- ) {
						name = captionNames[ i ];
						setting = item.itemSettings[ name ];

						if ( wrappers[ setting ] ) {
							fbName = camelCase( 'fb-' + name );
							if ( ( $fbNode = thisBox[ fbName ] ) ) {
								placeElement( $fbNode.firstChild, wrappers[ setting ] );
							}
						}
					}

					// and content too
					setting = item.boxContent;
					if ( wrappers[ setting ] ) {
						placeElement( $fbContent.firstChild, wrappers[ setting ] );
					}

					// remove youtube api and clear iframe src
					if ( item.isIframe ) {
						if ( item.ytPlayer ) {
							item.ytPlayer.destroy();
							deleteProp( item, 'ytPlayer' );
						}
						$fbContent.src = aboutBlank;
					}

					trigger( item.itemSettings.afterItemEnd );
				}
				trigger( then );

			}  // end phase 1
		}  // collapse


		function fetchContent ( then ) {
			// create and populate fbContent
			var
				boxContent = activeItem.boxContent,
				altContent = activeSettings.altContent || '',  // 508 compliance
				contentElType = activeItem.isImage ? 'img'
					: activeItem.isHtml ? 'div'
					: 'iframe',
				evt;

			// reuse existing fbContent if it's the same type
			// otherwise, create a new one
			$fbContent = thisBox.fbContent;
			if ( activeItem.isIframe  // because previous video iframes were nuked
				|| !getTagName( $fbContent, contentElType )
			) {
				placeElement( $fbContent );  // might not exist
				$fbContent = newBoxPart( 'fbContent', $fbContentWrapper, contentElType );
			}

			if ( activeItem.isImage ) {
				attr( $fbContent, 'alt', altContent );
				// let paintBox manage assigning src because crossAnimate
				preload( boxContent, then );  // for calcContentMetrics
			}

			else if ( activeItem.isIframe ) {

				attr( $fbContent, 'title', altContent );

				if ( activeItem.isVideo ) {
					trigger( then );
				}
				else {
					// wait for load before building the box so that slowLoader can show
					evt = addEvent( $fbContent, 'load',
						function () {
							removeEvent( evt );
							trigger( then );
						}
					);
					if ( !activeItem.isXSite ) {
						boxEvents.push(
							addEvent( $fbContent, 'load', iframeOnload )
						);
					}
					$fbContent.src = boxContent;
				}
			}

			else {  // activeItem.isHtml

				$fbContent.innerHTML = '';  // clear sameBox or gallery content

				if ( activeItem.isAjax ) {
					ajax( boxContent, {
						finish: function ( result ) {
							// write response to the measurement div
							setContent( $fbContent,
								makeOuterHtml( 'div', result.responseText ),  // wrap in a div
								true  // run scripts
							);
							trigger( then );
						}
					} );
				}

				else {
					if ( wrappers[ boxContent ] ) {
						placeElement( wrappers[ boxContent ].firstChild, $fbContent );
					}
					if ( !$fbContent.innerHTML ) {
						setContent( $fbContent, makeOuterHtml( 'div', boxContent ), true );
					}
					trigger( then );
				}
			}
		}  // fetchContent

		function iframeOnload () {
			// Onload action for same-domain iframe content.
			// Inserts keyboard handler, restacks when clicked, scrolls to #hash request.
			var
				view = $fbContent && getOwnerView( $fbContent.contentWindow ),
				// require same domain because content may have navigated to cross-domain
				doc = view && view.document,
				$docEl = doc && doc.documentElement;

			function scrollToHash () {
				// prevents the underlying host page from trying to scroll to it too
				var
					$el = $( activeItem.scrollHash, doc ),
					offset;

				if ( $el ) {
					offset = getRect( $el ).top - getRect( $docEl ).top;
					view.scroll( 0, offset );
				}
			}

			if ( $docEl && view.location.href.indexOf( aboutBlank ) < 0 ) {

				// don't save these events in itemEvents because IE, all versions,
				// will barf trying to remove them if the iframe has navigated

				if ( enableKeyboardNav ) {
					// add keydown handler so esc key closes the box
					addEvent( $docEl, 'keydown', keydownHandler );
				}

				if ( !isModal && !isContip ) {
					// restack this box on click
					addEvent( $docEl, [ 'mousedown', 'touchstart' ], restack );
				}

				if ( !$fbContent.ready ) {
					// scroll to hash
					if ( activeItem.scrollHash ) {
						scrollToHash();
						// redo after box is up in case a size change moved the scroll target
						activeItem.scrollToHash = scrollToHash;
					}
					$fbContent.ready = true;
				}

				else {  // new content from navigation, adjust box size
					nativeMargins = undefined;
					resize();
				}
			}
		}  // iframeOnload


		function calcContentMetrics ( then ) {
			// Determine content width & height.
			var
				native = {},
				scaled,
				sum;

			function enforceMinMax () {

				scaled = scale(  // scale up to enforce minWidth/Height
					contentWidth, contentHeight,
					minContentWidth, minContentHeight,
					aspect, true, 1
				);

				scaled = scale(  // scale down to enforce maxWidth/Height
					scaled.width, scaled.height,
					maxContentWidth, maxContentHeight,
					aspect, false, -1
				);

				contentWidth = scaled.width;
				contentHeight = scaled.height;
			}  // enforceMinMax

			// reset on each call
			contentWidth = resolvePercent( requestedMetrics.width, viewport.width );
			contentHeight = resolvePercent( requestedMetrics.height, viewport.height );
			if ( activeItem.isMedia && !aspect ) {  // all media is proportional
				aspect = nativeWidth / nativeHeight
					|| contentWidth / contentHeight
					|| activeItem.isVideo && 16 / 9
					|| 0;  // will set on next pass after nativeW/H are got
			}

			contentWidth = contentWidth
				|| aspect && contentHeight * aspect
				|| nativeWidth
				|| mathMin( viewport.width * 0.87, 980 );

			contentHeight = contentHeight
				|| aspect && contentWidth / aspect
				|| nativeHeight
				|| viewport.height * 0.87;

			// nativeSize calc uses initial content metrics
			// and final content metrics calc uses native dims

			if ( !nativeWidth ) {

				setScrolling( false );

				if ( activeItem.isImage ) {
					native = preloads[ activeItem.boxContent ];
				}
				else {
					enforceMinMax();  // not for images, they can inframe zoom
					if ( !activeItem.isXSite
						&& !( requestedMetrics.width && requestedMetrics.height )
					) {
						native = measureHtml( contentWidth, contentHeight );
					}
				}

				nativeWidth = native.width || contentWidth;
				nativeHeight = native.height || contentHeight;
				calcContentMetrics( then );  // back to the top
			}

			else {  // nativeSize has been got

				// apportion sticky size deltas to new item's proportions
				if ( aspect ) {
					sum = movedMetrics.width + movedMetrics.height;
					movedMetrics.height = sum / ( aspect + 1 );
					movedMetrics.width = sum - movedMetrics.height;
				}

				// apply stickies
				contentWidth += movedMetrics.width;
				contentHeight += movedMetrics.height;
				enforceMinMax();

				// cancel and remove slow-load indicator
				clearTimer( TIMER_slow, boxTimeouts );
				placeElement( thisBox.fbSlowLoad );

				// image preloader passes the img into the callback, which we don't want
				trigger( then && !then.src ? then : [ collapse, setPanelContent ] );
			}
		}  // calcContentMetrics


		function setPanelContent () {
			// Setup new content and panels.
			var
				boxContent = activeItem.boxContent,
				max = itemCount - 1,
				$fbNode,
				$child,
				$text,
				name,
				fbName,
				setting,
				loRange,
				hiRange,
				range,
				nextIdx,
				thisItem,
				$newThumb,
				thumbSrc,
				i;

			function configureLink ( $node, href, html ) {
				// update various panel component links

				if ( $node && href ) {
					attr( $node, 'href', href && encodeHTML( href ) || null );
					select( '.fbText', $node, 0 ).innerHTML = html || '';
				}
				setStyle( $node, 'display', href ? '' : 'none' );
			}

			// captions, header and footer
			i = captionNames.length;
			while ( i-- ) {
				name = captionNames[ i ];
				setting = activeSettings[ name ];
				fbName = camelCase( 'fb-' + name );
				$fbNode = thisBox[ fbName ];

				if ( $fbNode ) {
					$fbNode.innerHTML = '';

					if ( wrappers[ setting ] ) {
						placeElement( wrappers[ setting ].firstChild, $fbNode );
						attr( select( '*', $fbNode ),
							'tabindex', null  // remove outline from clicked links in captions
						);
					}

					else {
						$fbNode.innerHTML = setting || '';
					}

					setStyle( $fbNode, 'display', $fbNode.innerHTML ? '' : 'none' );
				}
			}

			// item x of y
			if ( thisBox.fbItemNumber ) {
				thisBox.fbItemNumber.innerHTML = patch(
					strings[
						justImages ? STR_image
						: hasImage ? STR_item
						: STR_page
					],
					'%1', activeIndex + 1,
					'%2', itemCount
				);
			}

			// info link
			if ( ( $fbNode = thisBox.fbInfo ) ) {
				configureLink( $fbNode,
					activeSettings.info,
					activeSettings.infoText || strings[ STR_info ]
				);
				attr( $fbNode, 'data-fb-options',
					makeOptionString( parseOptions( activeSettings.infoOptions ) )
				);
			}

			// print button
			if ( ( $fbNode = thisBox.fbPrint ) ) {
				configureLink( $fbNode,
					activeSettings.showPrint && !activeItem.isXSite && boxContent,
					activeSettings.printText || strings[ STR_print ]
				);
			}

			// new window link
			if ( ( $fbNode = thisBox.fbNewWindow ) ) {
				configureLink( $fbNode,
					activeSettings.showNewWindow && activeItem.isUrl && boxContent,
					strings[ STR_open ]
				);
			}

			// index links
			if ( ( $fbNode = thisBox.fbIndex ) ) {
				$fbNode.innerHTML = '';

				// calc indices for items within range of current item
				if ( numIndexLinks == -1 ) {  // -1 means no restriction on link count
					loRange = 0;
					hiRange = max;
				}

				else {
					range = (numIndexLinks >>> 1) - 1;
					loRange = activeIndex - range;
					hiRange = activeIndex + range;

					if ( loRange <= 0 ) {
						hiRange += mathMin( 1 - loRange, range );
					}

					if ( !activeIndex ) {
						hiRange++;  // index is zero
					}

					if ( hiRange - max >= 0 ) {
						loRange -= mathMin( 1 + hiRange - max, range );
					}

					if ( activeIndex == max ) {
						loRange--;
					}
				}

				for ( i = 0; i < itemCount; i++ ) {  // iterate each item and build a series of links
					nextIdx = i && i < loRange ? loRange  // jump to first in-range item
						: i != max && i > hiRange ? max  // jump to last item
						: i;
					if ( nextIdx != i ) {  // add dots if skipped items
						i = nextIdx;
						$child = newElement( 'span', '...' );
						setStyle( $child, 'color', getStyle( $fbNode, 'color' ) );
						placeElement( $child, $fbNode );
					}

					thisItem = currentSet[ i ];
					if ( thisItem.isUrl ) {

						// build a clickable anchor for this item
						$child = newElement( 'a' );

						// add popup thumb (as first-child)
						setting = thisItem.itemSettings.indexThumbSource;
						thumbSrc =
							( setting == 'href' ? thisItem.isImage && thisItem.boxContent : setting )
							|| thisItem.thumbSrc;
						if ( thumbSrc && boxSettings.showIndexThumbs !== false ) {
							addClass( $child, 'fbPop' + ( /t/.test( indexPos ) ? 'down' : 'up' ) );
							$newThumb = newElement( 'img' );
							if ( ( setting = boxSettings.maxIndexThumbSize ) ) {
								setStyle( $newThumb, {
									maxWidth: setting,
									maxHeight: setting
								} );
							}
							$newThumb.src = thumbSrc;
							placeElement( $newThumb, $child );
						}

						// add link text
						setStyle( $child, 'color', textColor );
						$text = newElement( 'span' );
						addClass( $text, 'fbText' );  // underline on mouseover
						placeElement( $text, $child );

						// add to doc and finalize this index link setup
						if ( i == activeIndex ) {
							addClass( $child, 'fbCurrentIndex' );
						}
						else {
							itemEvents.push(
								addEvent( $child, [ 'mouseover', 'mouseout' ], highlightHandler )
							);
						}
						placeElement( $child, $fbNode );
						configureLink( $child,
							thisItem.boxContent,
							'&nbsp;' + ( i + 1 ) + '&nbsp;'
						);

						// add click handler (co-operate with popupHandler)
						attr( $child, 'data-fb', i );
						itemEvents.push(
							addEvent( $child, 'click', function ( e ) {
								stopEvent( e );
								if ( tapInfo.type ) {
									popupHide( this );
									showItem( attr( this, 'data-fb' ) );
								}
							} )
						);
					}
				}
				popupActivate( select( 'a', $fbNode ), thisBox );
			}

			// nav controls for sameBox restarts
			setStyle( thisBox.fbNav, 'display', itemCount > 1 ? '' : 'none' );

			paintBox();  // carry on
		}  // setPanelContent


		function paintBox ( fit, time ) {
			// Display the box.
			var
				boxContent = activeItem.boxContent,
				contentSrc = preloads[ boxContent ] && preloads[ boxContent ].src || boxContent,
				zoomStart = zoomSource && thisBox.state == STATE_start,
				wrapperRect = getRect( $fbContentWrapper ),
				$docEl = topDoc.documentElement,
				top,
				contentRect,
				backwards,
				scaled,
				startBig,
				contentPos,
				floaterPos;

			fit = ifNotSet( fit,
				sizeState == SIZE_large && !inFrameResize ? false : autoFit
			);

			// pageScroll (remove browser scrollbars)
			if ( thisBox.state == STATE_start && disablePageScroll && !pageScrollDisabled ) {
				top = getRect( tapInfo.$ ).top + getStyle( $docEl, 'marginTop', true );  // current
				setStyle( $docEl, 'marginRight',
					getStyle( $docEl, 'marginRight', true ) + topView.innerWidth - $docEl.clientWidth
				);
				setStyle( topDoc.body, 'overflow', 'hidden' );
				top -= getRect( tapInfo.$ ).top;  // adjusted for possible new page layout delta
				if ( top > 1 ) {
					setStyle( $docEl, 'marginTop', top );
				}
				pageScrollDisabled = thisBox;
				viewportHandler();
			}

			calcBoxMetrics( fit );

			if ( crossAnimate ) {

				contentRect = getRect( $fbContent );
				wrapperRect.width -= innerBorder * 2;
				wrapperRect.height -= innerBorder * 2;

				// going backwards? (the 3 handles two-member sets)
				backwards = activeIndex == ( previousIndex || mathMax( itemCount, 3 ) ) - 1;
				$fbFloater.src = $fbContent.src;  // fbFloater shows current item

				// set floater's initial position and opacity (on top of existing fbContent)
				setStyle( $fbFloater, {
					left: contentRect.left - wrapperRect.left - innerBorder,
					top: contentRect.top - wrapperRect.top - innerBorder,
					width: contentRect.width,
					height: contentRect.height,
					opacity: 1
				} );
				placeElement( $fbFloater, $fbContentWrapper );  // on top of fbContent

				// calc floater's final position and size based on the calced dimension of the new box
				scaled = scale(
					contentRect.width,
					contentRect.height,
					crossFade ? contentWidth : contentRect.width,
					contentHeight,
					contentRect.width / contentRect.height,
					true
				);

				floaterPos = { $: $fbFloater,
					left: crossFade ? ( contentWidth - scaled.width ) / 2
						: backwards ? contentWidth
						: crossExpand ? 0
						: -scaled.width,  // slide or shift
					top: ( contentHeight - scaled.height ) / 2,
					width: crossExpand ? 0 : scaled.width,
					height: scaled.height
				};

				if ( crossFade ) {
					floaterPos.opacity = 0;
				}

				// set new fbContent's starting position
				startBig = crossShift && wrapperRect.height < contentHeight;
				scaled = scale(
					contentWidth,  // new image
					contentHeight,
					startBig ? contentWidth : wrapperRect.width,
					startBig ? contentHeight : wrapperRect.height,
					aspect,
					true, 1
				);

				setStyle( $fbContent, {
					left: crossFade ? ( wrapperRect.width - scaled.width ) / 2
						: crossSlide ? 0
						: backwards ? ( crossExpand ? 0 : -scaled.width )
						: wrapperRect.width,  // expand or shift, not backwards
					top: ( wrapperRect.height - scaled.height ) / 2,
					width: crossExpand ? 0 : scaled.width,
					height: scaled.height
				} );

				$fbContent.src = contentSrc;
			}

			if ( !zoomStart ) {
				setStyle( $fbMain, 'visibility', '' );  // otherwise let appear reveal the box

				if ( splitResize && !getStyle( $fbMain, 'width', true ) ) {
					// animate up to small box size before doing split animation

					boxAnimate(
						{ $: $fbMain,
							left: boxLeft + offsetOrigin.left + ( boxWidth - smallBoxSize ) / 2,
							top: boxTop + offsetOrigin.top + ( boxHeight - smallBoxSize ) / 2,
							width: smallBoxSize,
							height: smallBoxSize
						},
						0, resizeTime
					);
				}
			}

			time = +time === time ? time
				: thisBox.state == STATE_change ? transitionTime
				: zoomStart ? 0
				: resizeTime;

			// timeless image swaps didn't update src in crossAnimate
			if ( activeItem.isImage && $fbContent.src != contentSrc ) {
				$fbContent.src = contentSrc;
			}

			if ( crossAnimate || zoomedContent() ) {
				contentPos = { $: $fbContent,
					left: 0,
					top: 0,
					width: contentWidth,
					height: contentHeight
				};
			}

			boxAnimate( [
					{ $: $fbMain,
						left: boxLeft + offsetOrigin.left,
						top: boxTop + offsetOrigin.top,
						width: boxWidth - outerBorder * 2,  // content-box
						height: boxHeight - outerBorder * 2,
						borderWidth: outerBorder
					},
					contentSides,
					contentPos,
					floaterPos  // only if crossAnimating
				],
				appear,
				time,
				splitResize && !crossAnimate && (
					contentWidth - wrapperRect.width
					> contentHeight - wrapperRect.height
					? 'x' : 'y'  // shrink before grow
				)
			);
		}  // paintBox

		function calcBoxMetrics ( fit, autoFitCount, firstScaling, captionHeight ) {
			// Box dimensions, including panels.
			var
				placement,
				newCaptionHeight,
				freeSpace,
				ratio,
				factor,
				rect,
				scaled,
				dx, dy,
				moved,
				pad;

			if ( thisBox.state && $fbMain ) {
			// might have been closed during the content fetch

				if ( !autoFitCount ) {  // need to calc min requests once only on first pass
					minBoxWidth = resolvePercent(
						ifNotSet( activeSettings.minBoxWidth, boxSettings.minBoxWidth ),
						viewport.width, 0
					);
					minBoxHeight = resolvePercent(
						ifNotSet( activeSettings.minBoxHeight, boxSettings.minBoxHeight ),
						viewport.height, 0
					);
				}

				// set panel cell widths, vertically pad out the panels, and capture their height
				// includes header and footer
				boxWidth = contentWidth + ( innerBorder + outerBorder + padding ) * 2;
				minBoxWidth = mathMax( 0, minBoxWidth - boxWidth );  // delta
				maxBoxWidth = viewport.width - autoFitSpace * 2;  // available width
				layoutPanels();  // uses boxWidth and minBoxWidth

				// header/footerSpace are the gaps to be left between the outerBorder and viewport edge
				headerSpace = panelHeight.fbHeader + autoFitSpace;
				footerSpace = panelHeight.fbFooter + autoFitSpace;

				// contentWidth/Height is inside innerBorder
				// boxWidth/Height is outside outerBorder
				boxHeight = contentHeight
					+ ( innerBorder + outerBorder ) * 2
					+ panelHeight.fbTopPanel + panelHeight.fbBottomPanel;
				maxBoxHeight = viewport.height - headerSpace - footerSpace;

				autoFitCount = ifNotSet( autoFitCount,
					fit ? 3 : -1
				);

				dx = boxWidth - maxBoxWidth;
				dy = boxHeight - maxBoxHeight;
				if ( fit && autoFitCount > 0 && ( dx > 0 || dy > 0 ) ) {
					// scale content down if box is bigger than available screen

					// don't let large caption height grow more than the box shrinks
					newCaptionHeight = mathMax(
						hasCaption ? thisBox.fbCaption.offsetHeight : 0,
						hasCaption2 ? thisBox.fbCaption2.offsetHeight : 0
					);
					if ( autoFitCount == 2 ) {
						firstScaling = {
							width: contentWidth,
							height: contentHeight
						};
					}
					else if ( newCaptionHeight > captionHeight ) {
						fit = false;
						contentWidth = firstScaling.width;
						contentHeight = firstScaling.height;
					}

					if ( fit ) {

						if ( aspect ) {

							// scale down proportionally
							scaled = scale(
								contentWidth, contentHeight,
								contentWidth - dx, contentHeight - dy,
								aspect, false, -1
							);

							// scale up to enforce minWidth/Height
							scaled = scale(
								scaled.width, scaled.height,
								minContentWidth, minContentHeight,
								aspect, true, 1
							);

							contentWidth = scaled.width;
							contentHeight = scaled.height;
						}

						else {  // non-proportional html and iframes

							contentWidth = mathMax( minContentWidth, contentWidth - mathMax( dx, 0 ) );
							contentHeight = mathMax( minContentHeight, contentHeight - mathMax( dy, 0 ) );
							fit = false;  // no need to iterate
						}
					}

					return calcBoxMetrics( fit, autoFitCount - 1, firstScaling, newCaptionHeight );
				}

				// apply minBoxWidth/Height (minBoxWidth calced above)
				minBoxHeight = mathMax( 0, minBoxHeight - boxHeight );  // delta

				boxWidth += minBoxWidth;
				boxHeight += minBoxHeight;

				contentSides = {
					$: $fbContentWrapper,
					top: panelHeight.fbTopPanel + minBoxHeight / 2,
					right: padding + minBoxWidth / 2,
					bottom: panelHeight.fbBottomPanel + minBoxHeight / 2,
					left: padding + minBoxWidth / 2
				};

				// now we've got all the content metrics plus boxWidth/Height

				// calc boxLeft/Top

				if ( isTooltip ) {
					placement = boxSettings.placement || 'bottom';
					getTooltipPos( placement, 0, 0 );  // sets boxLeft and boxTop
				}

				else {

					boxLeft = resolvePercent(
						requestedMetrics.left,
						viewport.width,
						( viewport.width - boxWidth ) / 2
					) + movedMetrics.left;

					freeSpace = viewport.height - boxHeight - headerSpace - footerSpace;
					ratio = freeSpace / viewport.height;  // move box up on taller screens
					factor = ratio <= 0.1 ? 2  // min
						: ratio < 0.2 ? 1.5 + ratio * 5
						: 2.5;  // max

					boxTop = resolvePercent(
						requestedMetrics.top,
						viewport.height,
						freeSpace / factor + headerSpace
					) + movedMetrics.top;

					// move html child box half way to the parent, if parent is higher and lefter
					if ( parentBox && !activeItem.isMedia ) {
						rect = getRect( parentBox.fbMain );

						if ( requestedMetrics.left === undefined && rect.left > 0 ) {  // is on screen
							dx = boxLeft - rect.left;  // distance of child box from parent
							boxLeft -= dx > 0 ? dx / 2 : 0;
						}

						if ( requestedMetrics.top === undefined && rect.top > 0 ) {
							dy = boxTop - rect.top;
							boxTop -= dy > 0 ? dy / 2 : 0;
						}
					}
				}

				if ( thisBox.state != STATE_resize ) {

					dx = dy = moved = 0;  // box move deltas

					// move left if the right side is off-screen
					pad = viewport.width - autoFitSpace - boxWidth - boxLeft;
					if ( pad < 0 ) {
						dx = moved = pad;
						if ( placement == 'right' ) {
							placement = 'left';
							dx = 0;
						}
					}

					// but move right if left side is off-screen takes precedence
					pad = autoFitSpace - boxLeft;
					if ( pad > 0 ) {
						dx = moved = pad;
						if ( placement == 'left' ) {
							placement = 'right';
							dx = 0;
						}
					}

					// move up if the bottom side is off-screen
					pad = viewport.height - footerSpace - boxHeight - boxTop;
					if ( pad < 0 ) {
						dy = moved = pad;
						if ( placement == 'bottom' ) {
							placement = 'top';
							dy = 0;
						}
					}

					// but move down if top side is off-screen takes precedence
					pad = headerSpace - boxTop;
					if ( pad > 0 ) {
						dy = moved = pad;
						if ( placement == 'top' ) {
							placement = 'bottom';
							dy = 0;
						}
					}

					if ( moved ) {

						if ( isTooltip ) {
							getTooltipPos( placement, dx, dy );
						}

						else {

							if ( requestedMetrics.left === undefined
								|| requestedMetrics.left == startTapX  // startTap for boxLeft:click requests
							) {
								boxLeft += dx;
							}

							if ( requestedMetrics.top === undefined
								|| requestedMetrics.top == startTapY
							) {
								boxTop += dy;
							}
						}
					}
				}

				// always apply box left/top adjustments to final position
				boxLeft += resolvePercent( boxSettings.boxLeftAdjust, viewport.width, 0 );
				boxTop += resolvePercent( boxSettings.boxTopAdjust, viewport.height, 0 );

				// override boxTop for locked content position after resizing
				if ( +lockContentTop === lockContentTop ) {
					boxTop = lockContentTop - panelHeight[ 'fbTopPanel' ] - outerBorder;
					lockContentTop = undefined;
				}

			}
		}  // calcBoxMetrics

		function layoutPanels () {
			// Configures and measures topPanel, bottomPanel, header and footer.
			var
				$panels = [ 'fbTopPanel', 'fbBottomPanel', 'fbHeader', 'fbFooter' ],
				fullPanelWidth = boxWidth + minBoxWidth - outerBorder * 2,
				$indexImgs = thisBox.fbIndex && select( 'img', thisBox.fbIndex ),
				cellWidths = [],
				$panel,
				fbName,
				center,
				isUpTop,
				panelWidth,
				$cells,
				widthOrder,
				over,
				delta,
				width, height,
				xpad, ypad,
				i;

			while ( $panels.length ) {
				fbName = $panels.pop();
				isUpTop = fbName == 'fbTopPanel' || fbName == 'fbHeader';
				panelHeight[ fbName ] = 0;  // default

				if ( ( $panel = thisBox[ fbName ] ) ) {

					setStyle( $panel, extend( {
							display: '',  // empty panels were hidden
							margin: '0 auto'
						},
						resetCss
					) );

					if ( !/Panel/.test( fbName ) ) {
					// fbHeader, fbFooter

						setStyle( $panel, 'width', fullPanelWidth );
						height = $panel.offsetHeight;

						if ( height ) {
							panelHeight[ fbName ] = height + 2;
							setStyle( $panel, 'width' );
							setStyle( $panel, isUpTop ? 'bottom' : 'top', '100%' );
							setStyle( $panel, 'margin' + ( isUpTop ? 'Bottom' : 'Top' ), outerBorder );
						}

						else {
							setStyle( $panel, extend( {
									display: 'none'
								},
								resetCss
							) );
						}
					}

					else {
					// fbTopPanel, fbBottomPanel

						xpad = padding || panelPadding;
						xpad = mathMax( xpad, boxRadius / 2 - xpad );  // move in from large box roundies
						panelWidth = fullPanelWidth - xpad * 2;
						setStyle( $panel, 'width', panelWidth );

						// hide indexLink thumbs from measuring
						setStyle( $indexImgs, 'display', 'none' );

						over = 2 - panelWidth;  // -ve overage if it's not too wide
						$cells = select( '.fbCell', $panel );  // there will be three of them

						// let cells find their own width
						setStyle( $cells, {
							width: 'auto',
							marginRight: ''
						} );

						// if center cell has something, make left and right cells match widths
						center = ifNotSet( activeSettings.strictCentering, true );
						if ( $cells[ 1 ].offsetWidth
							&& ( center === true || fbName.toLowerCase().indexOf( center ) > -1 )
						) {
							setStyle( [ $cells[ 0 ], $cells[ 2 ] ],
								'minWidth',
								mathMax(
									getRect( $cells[ 0 ] ).width,
									getRect( $cells[ 2 ] ).width
								)
							);
						}

						// capture cell content width
						i = 3;  // $cells.length
						while ( i-- ) {
							width = getRect( $cells[ i ] ).width;
							cellWidths[ i ] = width;
							over += width;
						}

						// set 20px margins between populated cells
						if ( cellWidths[ 0 ] && cellWidths[ 1 ] + cellWidths[ 2 ] ) {
							setStyle( $cells[ 0 ], 'marginRight', 20 );
							over += 20;
						}
						if ( cellWidths[ 1 ] && cellWidths[ 2 ] ) {
							setStyle( $cells[ 1 ], 'marginRight', 20 );
							over += 20;
						}

						// shrink oversized cells
						widthOrder = [ 0, 1, 2 ].sort( function ( a, b ) {
							return cellWidths[ a ] - cellWidths[ b ];  // from smallest to largest
						} );

						if ( over > 0 ) {

							// shrink largest to no less than second largest width
							delta = mathMin( over,
								cellWidths[ widthOrder[ 2 ] ] - cellWidths[ widthOrder[ 1 ] ]
							);
							cellWidths[ widthOrder[ 2 ] ] -= delta;
							over -= delta;

							if ( over > 0 ) {  // not enough?

								// shrink the two largest evenly to no less than the smallest
								delta = mathMin( over / 2,
									cellWidths[ widthOrder[ 1 ] ] - cellWidths[ widthOrder[ 0 ] ]
								);
								cellWidths[ widthOrder[ 2 ] ] -= delta;
								cellWidths[ widthOrder[ 1 ] ] -= delta;
								over -= 2 * delta;
							}

							if ( over > 0 ) {  // still not enough?

								// distribute remainder evenly to all three
								delta = over / 3;
								cellWidths[ 0 ] -= delta;
								cellWidths[ 1 ] -= delta;
								cellWidths[ 2 ] -= delta;
							}

							over = 0;  // avoid rounding error
						}

						// expand undersized cells so they don't bunch up on the left
						if ( over < 0 ) {  // expand left and right evenly to keep center centered
							delta = over / 2;
							cellWidths[ 0 ] -= delta;
							cellWidths[ 2 ] -= delta;
						}

						// set cell widths
						i = 3;
						width = 0;  // capture the presence of panel content here
						while ( i-- ) {
							width += $cells[ i ].offsetWidth;
							setStyle( $cells[ i ], {
								width: cellWidths[ i ],
								minWidth: ''
							} );
						}

						if ( !width ) {
							setStyle( $panel, extend( { display: 'none' }, resetCss ) );
						}
						height = getRect( $panel ).height;
						ypad = mathMax( height && panelPadding, mathMax( padding - height, 0 ) / 2 );

						if ( width ) {
							setStyle( $panel, {
								width: '',
								left: xpad,  // panels extend to the outer edge of innerBorder
								right: xpad
							} );
							setStyle( $panel, isUpTop ? 'top' : 'bottom', ypad );
						}

						// restore indexLink thumbs
						setStyle( $indexImgs, 'display', '' );

						// report full height between inner and outer borders
						panelHeight[ fbName ] = height + ypad * 2;
					}
				}
			}
		}  // layoutPanels

		function getTooltipPos ( placement, dx, dy ) {
			// Calc global boxLeft and boxTop screen coordinates for tooltips.
			// Also attaches and positions fbSpacer between fbMain and host element.
			var
				$fbSpacer = thisBox.fbSpacer,
				$fbArrow = $fbSpacer && $fbSpacer.firstChild,
				arrowSize = ifNotSet( boxSettings.arrowSize, 16 ),
				hostRect = getRect( activeItem.hostEl );

			boxLeft = hostRect.x - boxWidth / 2;
			boxTop = hostRect.y - boxHeight / 2;

			if ( placement != 'center' ) {  // center gets no arrow or position adjustments

				if ( !$fbSpacer ) {
					$fbSpacer = newBoxPart( 'fbSpacer', $fbMain, 'div' );
					$fbArrow = newElement( 'i' );
					addClass( $fbArrow, 'fbIcon' );
					setStyle( [ $fbSpacer, $fbArrow ], {
						color: boxSettings.arrowColor || outerBorderColor,
						fontSize: arrowSize
					} );
					placeElement( $fbArrow, $fbSpacer );
				}

				$fbArrow.innerHTML = icons[ 'tooltip' + placement ];

				setStyle( [ $fbSpacer, $fbArrow ], {
					top: '',
					right: '',
					bottom: '',
					left: ''
				} );

				if ( placement == 'left' || placement == 'right' ) {

					boxLeft +=
						( ( hostRect.width + boxWidth ) / 2 + arrowSize - 1 )
						* ( placement == 'left' ? -1 : 1 );
					boxTop += dy;

					setStyle( $fbSpacer, {
						top: mathMax( hostRect.top - boxTop - outerBorder, -outerBorder ),
						height: mathMin( boxHeight, hostRect.height ),
						width: arrowSize + 1
					} );
					setStyle( $fbSpacer, placement, boxWidth - outerBorder - 1 );
				}

				else {  // placement == top or default bottom

					boxLeft += dx + boxWidth / 5;  // looks better off-center
					boxTop +=
						( ( hostRect.height + boxHeight ) / 2 + arrowSize - 1 )
						* ( placement == 'top' ? -1 : 1 );

					setStyle( $fbSpacer, {
						left: mathMax( hostRect.left - boxLeft - outerBorder, -outerBorder ),
						width: mathMin( boxWidth, hostRect.width ),
						height: arrowSize + 1
					} );
					setStyle( $fbSpacer, placement, boxHeight - outerBorder - 1 );
				}
			}
		}  // getTooltipPos


		function appear ( phase ) {
			// Reveal the new box, or finish new item transition
			var contentRect;

			if ( thisBox.state ) {

				if ( !phase ) {  // phase 0

					// reset post-transition content and floater
					if ( thisBox.state == STATE_change ) {
						setStyle( $fbContent, resetCss );
						placeElement( $fbFloater );
						$fbFloater.src = blankGif;
						setStyle( $fbFloater, 'opacity', 1 );
					}

					// carry on
					if ( zoomSource && thisBox.state == STATE_start ) {
						phase = 1;  // fall through
					}
					else {
						showContent();
					}

				}  // end phase 0

				if ( phase == 1 ) {  // phase 1

					// unlock and hide popup thumb, if there is one
					popups.locked = undefined;
					popupHide( activeItem.hostEl );

					// animate fbFloater up to the size and position where the content div will be
					// paintBox has placed fbMain in its final position, but invisible
					// fbFloater was setup in configureBox to be on top of the fading-in overlay
					$fbFloater.src = zoomSource;  // the full-sized image to zoom with
					contentRect = getRect( $fbContent );
					boxAnimate(
						{ $: $fbFloater,
							left: contentRect.left + offsetOrigin.left,
							top: contentRect.top + offsetOrigin.top,
							width: contentRect.width,
							height: contentRect.height
						},
						[ appear, 2 ],
						resizeTime
					);

				}  // end phase 1

				if ( phase == 2 ) {

					// prep the box
					setStyle( $fbMain, {
						opacity: 0,
						visibility: ''
					} );
					setStyle( $fbLiner, 'opacity', 1 );
					showContent( 0, [ appear, 3 ] );

				}  // end phase 2

				if ( phase == 3 ) {

					// fade in the box
					animate(
						{ $: $fbMain, opacity: 1 },
						// delay turning off the zoomer image to give non-img content time to establish
						[setTimer, [ appear, 4 ], !activeItem.isImage && 377 ],
						fadeTime
					);

				}  // end phase 3

				if ( phase == 4 ) {

					// fade out the zoomer for non-image content
					animate(
						{ $: $fbFloater, opacity: 0 },
						[ appear, 5 ],
						activeItem.isImage ? 0 : fadeTime
					);

				}  // end phase 4

				if ( phase == 5 ) {

					// discard the floating zoomer image
					placeElement( $fbFloater );
					setStyle( $fbFloater, 'borderWidth', 0 );
					$fbFloater.src = blankGif;  // so the old image doesn't wink at us on the next zoom

					// re-run showContent in normal mode
					showContent();

				}  // end phase 4
			}
		}  // appear


		function showContent ( phase, thenZoomIn ) {
			// Finalizes box configuration and shows content.
			var
				focusser,
				fader;

			function getYTPlayer () {
				activeItem.ytPlayer = new topView.YT.Player( $fbContent );
				// will post event messages for auto-end handling
			}

			if ( thisBox.state ) {

				if ( !phase ) {  // phase 0

					// avoid unwanted future cross-animations
					imageSwap = crossAnimate = false;

					if ( activeItem.isIframe && !thenZoomIn ) {

						// youtube api for auto-end handling
						if ( activeItem.vidService == 'youtube' ) {
							if ( self.YT ) {  // api is already loaded
								getYTPlayer();
							}
							else {
								self.onYouTubeIframeAPIReady = getYTPlayer;
								require( 'https://www.youtube.com/iframe_api' );
							}
						}

						if ( $fbContent.src != activeItem.boxContent ) {  // not set by fetchContent
							$fbContent.src = activeItem.boxContent;
						}
					}

					// determine neighbour items
					if ( itemCount > 1 ) {
						prevIndex = activeIndex ? activeIndex - 1 : enableWrap && itemCount - 1;
						nextIndex = activeIndex < itemCount - 1 ? activeIndex + 1 : enableWrap && 0;
						// prev/nextHref must be null, not "", for attr() to remove it if necessary
						prevHref = currentSet[ prevIndex ] && currentSet[ prevIndex ].boxContent || null;
						nextHref = currentSet[ nextIndex ] && currentSet[ nextIndex ].boxContent || null;
					}

					// toggle nav gadgets based on wrap status & update nav hrefs
					if ( navButton ) {
						attr( thisBox.fbPrev, 'href', prevHref );
						setStyle( thisBox.fbPrev, 'opacity', prevHref ? '' : 0.5 );
						attr( thisBox.fbNext, 'href', nextHref );
						setStyle( thisBox.fbNext, 'opacity', nextHref ? '' : 0.5 );
					}

					if ( navOverlay ) {
						attr( [ thisBox.fbPrevPanel, thisBox.fbPrev2 ], 'href', prevHref );
						attr( [ thisBox.fbNextPanel, thisBox.fbNext2 ], 'href', nextHref );
					}

					// avoid confusing play/pause controls when showing a video
					setStyle( thisBox.fbPlayPause, 'visibility',
						activeItem.isVideo ? 'hidden' : ''
					);

					// square the round corner that has visible fbDragger in it
					if ( draggerLocation ) {
						setBorderRadius(
							draggerLocation == OPT_one ? $fbMain : $fbContentWrapper,
							0,
							'BottomRight',
							draggerLocation == OPT_one && outerBorder
						);
					}

					// light up the content

					setStyle( $fbContentWrapper, 'backgroundColor',
						activeSettings.contentBackgroundColor
						|| activeItem.isVideo && 'black'
						|| ( activeItem.isIframe || activeItem.isHtml ) && 'white'
						|| ''
					);

					// do stuff for initial content (first content item)
					if ( thisBox.state == STATE_start ) {

						setBoxShadow();

						setStyle( [ thisBox.fbControls, thisBox.fbOuterClose ],
							'visibility', ''
						);
						if ( boxSettings.showMagCursor == 'once' ) {
							setStyle( activeItem.hostEl, 'cursor', '' );  // turn off show once mag cursor
						}
					}

					// for all content (first and subsequent gallery items)

					setStyle( [
							$fbLiner,  // fbLiner started life hidden in configureBox
							thisBox.fbTopPanel,
							thisBox.fbBottomPanel,  // collapse may have hidden the panels
							activeSettings.header && thisBox.fbHeader,
							activeSettings.footer && thisBox.fbFooter
						],
						'visibility', ''
					);

					if ( thenZoomIn ) {
						trigger( thenZoomIn );  // carry on zooming
					}

					else {
						postResize();  // resizer, navOverlay and useMap
						trigger( activeItem.scrollToHash );

						// fade in boxLiner (or box for tooltips) opacity
						fader = isContip ? $fbMain : $fbLiner;
						setTimer( [ boxAnimate,
							{ $: fader, opacity: 1 },
							[ showContent, 1 ],
							transitionTime && fadeTime
						] );
					}

				}  // phase 0

				if ( phase == 1 && thisBox && currentSet ) {

					if ( !activeItem.seen ) {
						activeItem.seen = true;
						itemsShown++;
					}

					if ( isSlideshow && !activeItem.isVideo ) {
						setTimer( showItem,
							( boxSettings.slideInterval || 4.5 ) * 999,  // 4.5 second default
							TIMER_slideshow, boxTimeouts
						);
					}

					preload( +nextIndex === nextIndex && currentSet[ nextIndex ].isImage && nextHref );

					// new box stuff
					if ( thisBox.state == STATE_start ) {
						if ( boxSettings.autoEnd ) {
							setTimer( end, boxSettings.autoEnd * 999, TIMER_end, boxTimeouts );
						}
						setTimer( [ boxSettings.afterBoxStart, thisBox ] );
					}

					// new item stuff
					if ( thisBox.state < STATE_show ) {

						if ( !activeSettings.noFocus ) {
							focusser = getOwnerView( $fbContent.contentWindow ) || $fbMain;
							focusser = select( [ 'input[type="text"]', 'textarea' ], focusser, 0 )
								|| focusser;
							focusser.focus();
						}

						setTimer( [ activeSettings.afterItemStart, thisBox ] );
					}

					// post-postResize
					if ( thisBox.state == STATE_resize ) {
						setTimer( afterResize );
					}

					// afterResize only once
					// scrollToHash has some closures into the iframe document
					afterResize = activeItem.scrollToHash = undefined;

					activate( $fbMain );  // activate after afterItemStart
					thisBox.state = STATE_show;

				}  // phase 1
			}
		}  // showContent


		function resize ( request, then, animationTime ) {
			// Resize a box in place.
			var
				metrics = {
					left: boxLeft,
					top: boxTop,
					width: contentWidth,
					height: contentHeight
				},
				rect,
				dim;

			if ( thisBox.state == STATE_show ) {

				// keepCentered request from viewportHandler
				if ( request === true && !isContip ) {
					rect = getRect( $fbMain );
					if ( ifNotSet( boxSettings.keepCentered,
						autoFit ||
						mathMax( rect.width, minBoxWidth ) < viewport.width - autoFitSpace * 2
						&& mathMax( rect.height, minBoxHeight ) < viewport.height - autoFitSpace * 2
					) ) {
						resize();
					}
				}

				// regular resize request
				else {
					request = request || {};
					for ( dim in metrics ) {

						if ( request[ dim ] === true ) {
							request[ dim ] = metrics[ dim ];
						}

						if ( aspect ) {
							if ( dim == 'width' && request.width && !request.height ) {
								request.height =
									resolvePercent( request.width, viewport.width ) / aspect;
							}
							else if ( dim == 'height' && request.height && !request.width ) {
								request.width =
									resolvePercent( request.height, viewport.height ) * aspect;
							}
						}

						movedMetrics[ dim ] = 0;  // start anew
					}

					requestedMetrics = extend( {}, optionMetrics, request );
					contentWidth = contentHeight = nativeWidth = nativeHeight = undefined;

					afterResize = then;
					thisBox.state = STATE_resize;
					calcContentMetrics( [
						collapse, [
							paintBox, undefined, animationTime
						]
					] );
				}
			}
		}  // resize


		function pause ( stop ) {
			// Sets slideshow state to paused or playing
			// and displays the appropriate control button.

			if ( isSlideshow ) {

				isPaused = stop;
				clearTimer( TIMER_slideshow, boxTimeouts );

				// show the appropriate control (if it's there)
				setStyle( thisBox.fbPlay, 'display', stop ? '' : 'none' );
				setStyle( thisBox.fbPause, 'display', stop ? 'none' : '' );

				if ( !stop ) {
					showItem( 'next' );
				}
			}
		}  // pause


		function reload ( source ) {
			// Refresh or replace the current content.

			if ( activeItem && activeItem.isUrl ) {

				if ( !activeItem.originalBoxContent ) {
					activeItem.originalBoxContent = activeItem.boxContent;
				}

				activeItem.boxContent = source || parseUrl(
					activeItem.boxContent,
					{ no_cache: now() }  // change the querystring
				).fullUrl;

				showItem( 'reload' );
			}
		}  // reload


		function goBack () {
			// Reverts to the previous content.
			if ( previousItem ) {
				start( previousItem, { sameBox: true } );
			}
		}  // goBack


		function restack () {
			// Change stack order of non-modal boxes.
			var
				topBox = getInstance(),
				topStack = topBox ? topBox.stackOrder : 0;

			if ( !isModal && thisBox.stackOrder < topStack ) {
				thisBox.stackOrder = topStack + 1;
				setZIndex();
			}
		}  // restack


		function end ( arg, phase ) {
			// Close down this floatbox.
			// arg:
			//   true to close all open boxes
			//   'self' to refresh page after box is gone,
			//   'back' to navigate page back in history list
			//   a url to navigate to that new page
			//   oncomplete callback
			var
				rect,
				noAnimation,
				timeout,
				thatBox,
				$host,
				nav,
				i;

			if ( !phase ) {  // phase 0

				if ( activeItem && thisBox.state > STATE_boot  // ignore duplicate end calls
					|| thisBox.fbSlowLoad.parentElement
				) {

					if ( animationStatus.active ) {  // wait for current animations to complete
						setTimer( [ end, arg ], 77, TIMER_end, boxTimeouts );
					}

					else if (  // run and check exit functions for the current item
						trigger( activeSettings.beforeItemEnd, thisBox ) !== false
						&& trigger( boxSettings.beforeBoxEnd, thisBox ) !== false
					) {
						thisBox.state = STATE_end;
						phase = 1;  // carry on ending
					}
				}
			}  // end phase 0

			if ( phase == 1 ) {

				for ( timeout in boxTimeouts ) {
					clearTimer( timeout, boxTimeouts );
				}

				// don't animate an offscreen box nor a secondary when ending all
				rect = getRect( $fbContentWrapper );
				noAnimation = !$fbContentWrapper.clientWidth
					|| boxIndex && arg === true  // end all
					|| rect.left > viewport.width  // content left is right of viewport
					|| rect.top > viewport.height  // content top is below viewport
					|| rect.right < 0  // content right is left of viewport
					|| rect.bottom < 0;  // content bottom is above viewport

				// and don't animate a non-modal box that has siblings
				if ( !( isModal || noAnimation ) ) {
					i = instances.length;
					while ( i-- ) {
						thatBox = instances[ i ];
						if ( thatBox && thatBox != thisBox && thatBox.fbMain && !thatBox.isModal ) {
							noAnimation = true;
						}
					}
				}

				// animated (or quick) end starts here
				setFixedPos( false );  // simplifies coordinate offset arithmetic
				if ( shadowSize ) {  // turn off shadows
					shadowSize = 0;
					setBoxShadow();
				}
				if ( noAnimation ) {
					resizeTime = 0;
					setStyle( $fbMain, 'display', 'none' );
				}

				// determine endPos (for naught if !resizeTime, but subsequent code still needs endPos)
				zoomSource = resizeTime && zoomSource !== null &&
					ifNotSet( activeSettings.zoomSource,
						activeItem.isImage && activeItem.boxContent
					);
				$host = activeItem.hostEl;
				popupShow( $host );  // put popup back so we can zoom out to it (if there is one)
				endPos = getAnimationOrigin( endAt );
				popupHide( $host );

				vanish( [ end, arg, 2 ] );

			}  // end phase 1

			if ( phase == 2 ) {
			// after vanish

				// remove pageScroll settings
				if ( pageScrollDisabled == thisBox ) {
					setStyle( topDoc.documentElement, {
						marginTop: '',
						marginRight: ''
					} );
					setStyle( topDoc.body, 'overflow', '' );
					pageScrollDisabled = undefined;
					viewportHandler();
				}

				setStyle( $fbMain, 'display', 'none' );
				$fbFloater.src = zoomSource || blankGif;

				if ( $fbOverlay ) {
					boxAnimate(
						{ $: $fbOverlay, opacity: 0 },
						[ end, arg, 3 ],
						overlayFadeTime
					);
				}
				else {
					phase = 3;  // fall through
				}
			}  // end phase 2

			if ( phase == 3 ) {
			// after overlay fadeout

				setStyle( $fbOverlay, 'display', 'none' );

				if ( zoomSource ) {
					boxAnimate(
						{ $: $fbFloater, opacity: 0 },
						[ end, arg, 4 ],
						0.3
					);
				}
				else {
					phase = 4;  // fall through
				}
			}  // end phase 3

			if ( phase == 4 ) {

				$fbFloater.src = blankGif;
				destroy();  // caution: thisBox is undefined after this
				if ( activeItem.originalBoxContent ) {
					activeItem.boxContent = activeItem.originalBoxContent;  // from reload()
				}
				trigger( boxSettings.afterBoxEnd );

				// callback passed in
				if ( arg && arg.call ) {
					trigger( arg );
				}

				// end all, close topBox
				thatBox = arg === true && getInstance();
				if ( thatBox ) {
					thatBox.end( arg );
				}

				// loadPageOnClose request
				nav = ''+arg === arg && arg
					|| activeSettings.loadPageOnClose
					|| boxSettings.loadPageOnClose;
				if ( nav == 'self' ) {
					topView.location.reload( true );
				}
				else if ( nav == 'back' ) {
					topView.history.back();
				}
				else if ( nav ) {
					topView.location.href = nav;
				}
			}  // end phase 4

		}  // end

		function vanish ( then, phase ) {
			// Animated box exit.
			var rect;

			if ( !phase ) {  // phase 0

				if ( !zoomSource ) {  // down to zero
					phase = 4;
				}
				else {  // down to a thumbnail
					zoomedContent( [ vanish, then, 1 ], true );  // reset in-frame-resized
				}

			}  // end phase 0

			if ( phase == 1 ) {
				// zooming, animate down to thumbnail

				// prep floater and place it over top of current content
				setStyle( $fbFloater, 'opacity', 0 );
				$fbFloater.src = zoomSource;
				rect = getRect( $fbContent );
				setStyle( $fbFloater, {
					left: rect.left + offsetOrigin.left,
					top: rect.top + offsetOrigin.top,
					width: rect.width,
					height: rect.height
				} );

				// opacity fade-in if non-image content
				placeElement( $fbFloater, $attachTo );
				animate(
					{ $: $fbFloater, opacity: 1 },
					[ vanish, then, 2 ],
					activeItem.isImage && 0
				);
			}  // end phase 1

			if ( phase == 2 ) {

				if ( activeItem.isVideo ) {
					placeElement( $fbContent );  // will silence a playing video
				}

				// fade out the box behind the floater
				animate(
					{ $: $fbMain, opacity: 0 },
					[ vanish, then, 3 ],
					fadeTime
				);

			}  // end phase 2

			if ( phase == 3 ) {

				// turn off the box and shrink fbFloater down to the thumbnail or starting position
				setStyle( $fbMain, 'display', 'none' );
				boxAnimate(
					extend( { $: $fbFloater }, endPos ),
					[ collapse, then ],
					resizeTime
				);

			}  // end phase 3

			if ( phase == 4 ) {
				// not zooming, animate down to zero

				if ( boxRadius && draggerLocation == OPT_one ) {
					setBorderRadius( $fbMain, boxRadius, 'BottomRight', outerBorder );
				}
				collapse( [ vanish, then, 5 ] );

			}  // end phase 4

			if ( phase == 5 ) {

				setStyle( [
						$fbLiner,
						thisBox.fbHeader,
						thisBox.fbFooter,
						thisBox.fbOuterClose
					],
					'display', 'none'
				);

				if ( splitResize ) {  // split animate down to small box size
					rect = getRect( $fbMain );
					boxAnimate(
						{ $: $fbMain,
							left: rect.x - smallBoxSize / 2 + offsetOrigin.left,
							top: rect.y - smallBoxSize / 2 + offsetOrigin.top,
							width: smallBoxSize,
							height: smallBoxSize
						},
						0,
						resizeTime,
						rect.width < rect.height ? 'x' : 'y'
					);
				}

				rect = { $: $fbMain,
					left: endPos.left + endPos.width / 2,
					top: endPos.top + endPos.height / 2,
					width: 0,
					height: 0
				};
				rect.borderWidth = 0;
				boxAnimate( rect, then, resizeTime );

			}  // end phase 5
		}  // vanish


		function destroy () {
			// Used box disposal service.
			var i;

			instances[ boxIndex ] = undefined;

			if ( !getInstance() ) {  // no more open boxes
				instances.length = 0;  // reset the sparse array
				removeEvent( firstEvents );
			}

			if ( !getInstance( undefined, true ) ) {  // no more modal boxes
				// remove touch-pan restrictor put in place by boot
				setStyle( topDoc.documentElement, 'touchAction', '' );
			}

			removeEvent( boxEvents );

			// cancel any pending timers
			for ( i in boxTimeouts ) {
				clearTimer( i, boxTimeouts );
			}

			// pull any items 'owned' by this box out of the items array
			i = items.length;
			while ( i-- ) {
				if ( items[ i ] && items[ i ].ownerBox == thisBox ) {
					items[ i ] = undefined;
					// don't splice because indices are captured in .fbx link expando
				}
			}
			i = popups.length;  // popups too
			while ( i-- ) {
				if ( popups[ i ] && popups[ i ].ownerBox == thisBox ) {
					popups[ i ] = undefined;
				}
			}

			// make main page tabable again
			i = tabRestrictions.length;
			while ( i-- ) {
				attr( tabRestrictions[ i ], 'tabindex', tabIndices[ i ] );
			}
			tabRestrictions.length = 0;

			// dispose of the box elements
			while ( nodeNames.length ) {
				placeElement( thisBox[ nodeNames.pop() ] );
			}

			thisBox = {};
			$attachTo = $fbContent = $fbContentWrapper =
				$fbFloater = $fbLiner = $fbMain = $fbOverlay = undefined;
		}  // destroy


		function boxAnimate ( things, then, time, split, easing ) {
			// Interface to fb.animate.
			// Will queue requests until current animation (if any) completes.
			// 'things' param can be singleton object, or array of objects.
			var
				aniThings = [],
				thing,
				i;

			if ( !things ) {
				// call without parameters is a callback from animate,
				// process the real callback and any queued requests
				setTimer( afterAnimation );
				setTimer( animationQueue.shift() );
				afterAnimation = undefined;
			}

			else if ( animationStatus.active ) {
				// animation is in progress, queue this new one
				animationQueue.push( [ boxAnimate, things, then, time, split, easing ] );
			}

			else {

				// arrayify incoming singleton objects
				if ( !isArray( things ) ) {
					things = [ things ];
				}

				for ( i = 0; i < things.length; i++ ) {
					if ( ( thing = things[ i ] ) ) {
						thing = extend( thing );  // copy, maintain original

						if ( split && getTagName( thing.$, 'div' ) ) {
							if ( split == 'x' ) {
								deleteProp( thing, 'left' );
								deleteProp( thing, 'right' );
								deleteProp( thing, 'width' );
							}
							else {  // split == 'y'
								deleteProp( thing, 'top' );
								deleteProp( thing, 'bottom' );
								deleteProp( thing, 'height' );
							}
						}

						aniThings.push( thing );
					}
				}

				// queue split animations and finish callbacks
				if ( split ) {
					animationQueue.push( [ boxAnimate, things, then, time, 0, easing ] );
				}
				else {
					afterAnimation = then;
				}

				animate(
					aniThings,
					boxAnimate,
					time,
					split ? 1 : undefined,
					easing,
					time && animationStatus
				);
			}
		}  // boxAnimate


		function getAnimationOrigin ( at ) {
			// Returns position record of values we want to use for starting and ending.
			var
				left = -bigNumber,
				top = -bigNumber,
				width = 0,
				height = 0,
				$at = $( at ),
				$thumb = !$at && boxSettings.showThis !== false && activeItem.thumbEl,
				$el = at === null ? at : $at || $thumb,
				rect,
				padding,
				border,
				x, y;

			if ( !startViewport ) {
				startViewport = extend( viewport );
			}

			if ( $el ) {
				rect = getRect( $el, topView );
				if ( $thumb && zoomSource && at != 'start' ) {
					// thumb dimensions
					padding = getStyle( $thumb, 'padding' );
					border = getStyle( $thumb, 'border' );
					left = rect.left + padding.left + border.left;
					top = rect.top + padding.top + border.top;
					width = rect.width - padding.left - padding.right - border.left - border.right;
					height = rect.height - padding.top - padding.bottom - border.top - border.bottom;
				}
				else {
					// center of element
					left = rect.x;
					top = rect.y;
				}
				if ( at == 'start' ) {
					startTapX = rect.x;
					startTapY = rect.y;
				}
			}

			x = left + width / 2;
			y = top + height / 2;
			if ( x < 7 || x > viewport.width || y < 7 || y > viewport.height ) {

				if ( startTapX && at !== null ) {
					// clicked coordinates, adjusted for any intervening page scroll
					// (but not adjusted for browser window resizes)
					left = startTapX + startViewport.left - viewport.left;
					top = startTapY + startViewport.top - viewport.top;
				}

				else {
					// viewport center
					left = viewport.width / 2;
					top = viewport.height / 3;
				}

				width = height = 0;
			}

			return { // document coordinates
				left: left + offsetOrigin.left,
				top: top + offsetOrigin.top,
				width: width,
				height: height
			};
		}  // getAnimationOrigin


		function setZIndex () {
			// Set z-index for components of this box.
			var
				fbNames = [  // order from lower to higher
					'fbOverlay',
					'fbMain',
					'fbPrevPanel',
					'fbNextPanel',
					'fbPrev2',
					'fbNext2',
					'fbResizer',
					'fbFloater',
					'fbOuterClose',
					'fbDragger'
				],
				base = boxSettings.zIndex || bigNumber,  // 77777 is default
				i = fbNames.length;

			base += i * thisBox.stackOrder - i + 1;
			while ( i-- ) {  // setStyle will filter non-existent nodes
				setStyle( thisBox[ fbNames[ i ] ], 'zIndex', base + i );
			}
		}  // setZIndex


		function zoomedContent ( then, always, time ) {
			// Reports if content is currently in-frame-resized.
			// If a 'then' action is passed, oversize content will be shrunk.
			// Set 'always' to run 'then' whether content gets shrunk or not.
			var zoomed = activeItem.isImage && $fbContent
					&& $fbContent.offsetWidth - $fbContentWrapper.clientWidth > 2;

			if ( then ) {
				if ( zoomed ) {
					boxAnimate( { $: $fbContent,
							left: 0,
							top: 0,
							width: contentWidth,
							height: contentHeight
						},
						[ zoomedContent, then, true ],
						+time === time ? time : resizeTime
					);
				}

				else {
					setStyle( $fbContent, resetCss );
					if ( always ) {
						trigger( then );
					}
				}
			}

			return zoomed;
		}  // zoomedContent


		function postResize ( collapsing ) {
			// Configures: resizer state, nav overlay, useMap assignment,
			//    scrollbars, boxScroll, slideshow timer.
			// Call this whenever the box finishes resizing for whatever reason.

			var
				isImage = activeItem.isImage,
				$map = $( activeSettings.useMap ),
				$contentImg = preloads[ activeItem.boxContent ],
				$fbResizer = thisBox.fbResizer,
				isZoomed = zoomedContent(),
				contentRect,
				cursor,
				areas,
				$area,
				dataCoords,
				coords,
				i, j;

			// start with resizer, navOverlay, hoverPan and scrollbars gone

			setStyle(
				[
					$fbResizer,
					thisBox.fbPrevPanel,
					thisBox.fbNextPanel,
					thisBox.fbPrev2,
					thisBox.fbNext2
				],
				'display', 'none'
			);
			setStyle( $fbContent, 'cursor', '' );

			removeEvent( $fbContentWrapper, 'mousemove', hoverPan );

			if ( thisBox.state ) {  // not ending
				setScrolling( false );
			}

			sizeState = SIZE_native;  // tbd

			// resizer, overlay nav, and useMaps
			if ( !collapsing ) {

				if ( !isZoomed ) {
					setStyle( $fbContent, resetCss );
				}

				// components for image content
				if ( isImage ) {

					contentRect = getRect( $fbContent );

					// resizer
					if ( resizeable ) {

						// determine size state and target based on current conditions
						if ( isZoomed
							|| mathMax(
								// content has been scaled up above its native size
								contentWidth - nativeWidth,
								contentHeight - nativeHeight,
								// or autoFit box is larger than current screen
								boxWidth + autoFitSpace * 2 - viewport.width,
								boxHeight + headerSpace + footerSpace - viewport.height
							) > 12
						) {
							sizeState = SIZE_large;
							cursor = zoomOutCursor;
						}

						// content is smaller than its native size
						else if (
							mathMin(
								contentRect.width - nativeWidth,
								contentRect.height - nativeHeight
							) < -32
						) {
							sizeState = SIZE_small;
							cursor = zoomInCursor;
						}

						// build the resizer if required
						if ( cursor ) {

							if ( resizeTool & OPT_one ) {  // show the resize cursor
								setStyle( $fbContent, 'cursor', cursor );
							}

							if ( resizeTool & OPT_two ) {
								// show the resize gadget and toggle the svg plus sign
								$fbResizer.firstChild.innerHTML = icons.zoom;
								setStyle( select( 'path', $fbResizer, -1 ),
									'display', sizeState == SIZE_large ? 'none' : ''
								);
								setStyle( $fbResizer, 'display', '' );
							}
						}
					}

					// mouseover panning for zoomed images
					if ( isZoomed && boxSettings.hoverPan !== false ) {
						addEvent( $fbContentWrapper, 'mousemove', hoverPan );
					}

					// useMap
					if ( $map && $map.id && $contentImg ) {

						areas = select( 'area', $map );
						i = areas.length;
						while ( i-- ) {
							if ( ( $area = areas[ i ] ) ) {

								dataCoords = attr( $area, 'data-coords' );
								coords = attr( $area, 'coords' );
								if ( /,/.test( coords ) ) {

									// capture original unscaled coordinates on the first visit
									if ( !dataCoords ) {
										dataCoords = patch( coords, /\s/g, '' );
										attr( $area, 'data-coords', dataCoords );
									}

									// scale coordinates to the image's new size
									coords = dataCoords.split( ',' );
									j = coords.length;
									while ( j-- ) {
										coords[ j ] = +coords[ j ] * (
											j % 2
											? contentRect.height / $contentImg.height
											: contentRect.width / $contentImg.width
										);
									}
									attr( $area, 'coords', coords.join( ',' ) );  // assign the scaled coordinates
								}
							}
						}

						attr( $fbContent, 'usemap', '#' + $map.id );
					}
				}

				// setup navOverlay
				if ( navOverlay ) {

					// panels for mousers viewing non-zoomed image content
					if ( isImage && !usingTouch && !isZoomed ) {
						setStyle( [
								prevHref && thisBox.fbPrevPanel,
								nextHref && thisBox.fbNextPanel
							],
							{
								width: ifNotSet( boxSettings.navOverlayWidth, 30 ) + '%',
								backgroundColor: 'rgba(0,0,0,0)',  // IE 10- mouse enabler
								display: ''
							}
						);
					}

					// widgets for all
					if ( showNavOverlay ) {
						setStyle( [
								prevHref && thisBox.fbPrev2,
								nextHref && thisBox.fbNext2
							],
							{
								top:  ifNotSet( boxSettings.navOverlayPos, 33 ) + '%',
								visibility:  showNavOverlay === true || !isImage ? '' : 'hidden',
								display:  ''
							}
						);
					}
				}

				// contentScroll (scrollbars for html and iframe content )
				setScrolling( true );

				// apply boxScroll (fixed positioning)
				setFixedPos( ifNotSet( disableBoxScroll,
					!usingTouch
					&& boxWidth < viewport.width
					&& boxHeight < viewport.height
				) );

			}  // if !collapsing
		}  // postResize

		function hoverPan ( e ) {
			// Move the inframe-resized image around with mouse moves
			var rect;

			if ( !usingTouch && !e.buttons ) {
				rect = getRect( $fbContentWrapper );
				setStyle( $fbContent, {
					left:
						mathMin( -.5, mathMax( contentWidth - nativeWidth + .5,
							( e.clientX - rect.left - innerBorder )
							* ( contentWidth - nativeWidth ) / contentWidth
						) ),
					top:
						mathMin( -.5, mathMax( contentHeight - nativeHeight + .5,
							( e.clientY - rect.top - innerBorder )
							* ( contentHeight - nativeHeight ) / contentHeight
						) )
				} );
			}
		}  // hoverPan


		function setScrolling( enable ) {
			// Turn scrollbars on or off
			if ( $fbContent ) {
				var
					iframeDoc = getOwnerView( $fbContent && $fbContent.contentWindow, 'document' ),
					$scroller = iframeDoc ? iframeDoc.documentElement : $fbContentWrapper,
					state = enable
						&& activeSettings.contentScroll !== false
						&& !activeItem.isImage
						&& !activeItem.isXSite
						? 'auto'
						: 'hidden';

				setStyle( $scroller, 'overflow', state );
			}
		}  // setScrolling


		function measureHtml ( wrapperWidth, wrapperHeight ) {
			// width and height of fbContent's content
			var
				width = wrapperWidth,  // default return values
				height = wrapperHeight,
				iframeDoc = getOwnerView( $fbContent.contentWindow, 'document' ),
				$target = iframeDoc ? iframeDoc.body : select( '*', $fbContent, 0 ),
				wrapperStyles,
				targetStyles,
				rect;

			if ( $target ) {

				// margins may report only prior to first measurement,
				// so we save them for subsequent use
				if ( !nativeMargins ) {
					nativeMargins = getStyle( $target, 'margin' );
				}

				// current styles for restoration
				wrapperStyles = {
					width: $fbContentWrapper.style.width,
					height: $fbContentWrapper.style.height
				};
				targetStyles = {
					position: $target.style.position,
					height: $target.style.height
				};

				setStyle( $fbContentWrapper, {
					width: wrapperWidth,
					height: wrapperHeight
				} );

				// div will grow to its content's height, including content margins
				// iframe body may shrink below available width
				// and won't grow to fill the iframe height
				setStyle( $target, {
					position: 'absolute',
					height: 'auto'
				} );

				rect = getRect( $target );
				width = rect.width + nativeMargins.left + nativeMargins.right;
				height = rect.height + nativeMargins.top + nativeMargins.bottom;

				// restore original styles
				setStyle( $target, targetStyles );
				setStyle( $fbContentWrapper, wrapperStyles );
			}

			return { width: width, height: height };
		}  // measureHtml


		function setFixedPos ( position ) {
			// Toggle fbMain css position.
			// Adjust left and top so screen position remains unaltered.
			// Keep offsetOrigin current with page scroll changes.
			var
				origin,
				rect;

			// keep offsetOrigin current with viewport changes
			offsetOrigin = {
				left: viewport.left - attachPos.left,
				top: viewport.top - attachPos.top
			};

			if ( !!position === position ) {
				origin = position ? visualOrigin : offsetOrigin;
				rect = getRect( $fbMain );
				setStyle( $fbMain, {
					position: position ? 'fixed' : 'absolute',
					left: rect.left + origin.left,
					top: rect.top + origin.top
				} );
			}
		}  // setFixedPos


		function setBoxShadow () {
			// Draw or remove css3 shadows.
			var
				style = '',
				offset,
				blur,
				spread;

			if ( shadowSize ) {
				if ( shadowType == 'drop' ) {
					offset = 1;
					spread = -0.3;
				}
				else if ( shadowType == 'halo' ) {
					offset = 0;
					spread = 0.7;
				}
				else {  // hybrid
					offset = 0.25;
					spread = 0.45;
				}

				offset = offset * shadowSize;
				blur = 0.8 * shadowSize;
				spread = spread * shadowSize;

				style = [
					offset, offset,
					blur, spread,
					'rgba(0,0,0,' + shadowOpacity + ')'
				].join( 'px ' );
			}

			setStyle( $fbMain, 'boxShadow', style );

		}  // setBoxShadow


		// expose Box interface methods and properties
		extend( thisBox, {
			isModal: isModal,
			stackOrder: stackOrder,
			// api methods
			showItem: showItem,
			resize: resize,
			pause: pause,
			reload: reload,
			goBack: goBack,
			end: end,
			// service methods
			boot: boot,  // called only from start
			restack: restack,  // for start
			keydownHandler: keydownHandler  // for itself
		} );

		// add to the topView.fb.data.instances array
		instances.push( thisBox );

		return thisBox;
	}  // newBox

///  end Box object

///  begin api functions

	function activate( $root ) {
		// A more complete replacement for fb.activate defined in floatbox.js.
		// That one lights up only standard floatbox links.
		// This one does all the goodies like cyclers and tooltips and whatnots.
		var
			$link,
			ownerBox,
			i;

		if ( $root === undefined ) {  // user api call
			// 'deactivate' everything (except popups and cyclers)

			i = items.length;
			while ( i-- ) {
				if ( ( $link = items[ i ] && items[ i ].hostEl ) ) {
					$link.fbx = $link.tip = $link.onclick = undefined;
					removeEvent( $link, [
							'touchend',
							'click',
							'contextmenu',
							'mouseover',
							'mouseout'
						],
						contipHandler
					);
				}
			}
			items.length = 0;
		}

		ownerBox = getOwnerInstance( $root );
		if ( $root !== false ) {  // not coreInit's initial call
			topData.activateLinks( $root, ownerBox );  // .floatboxClass stuff
		}
		contipActivate( select( '.' + contextClass + ',.' + tooltipClass, $root ), ownerBox );
		popupActivate( select( 'a[class*="fbPop"]', $root ), ownerBox );
		cyclerActivate( select( '.' + cyclerClass, $root ) );
	}  // activate


	function getRect ( $node, origin ) {
		// Returns node's viewport coords.
		//   { left, top, width, height, right, bottom, x, y (center) }.
		// Metrics are for the border-box including padding and border but not margin.
		// Relative to $node's viewport unless 'origin' requests a different reference viewport.
		$node = $( $node );
		var
			rtn = { left: 0, top: 0, width: 0, height: 0 },
			tagName = getTagName( $node ),  // no tagName, no gBCR
			ownerView = tagName && getOwnerView( $node ),
			offset,
			rect;

		if ( ownerView ) {
			origin = origin && getOwnerView( origin ) || ownerView;

			if ( tagName == 'area' ) {
				rtn = areaRect( $node ) || rtn;
			}

			else {  // normal node
				rect = $node.getBoundingClientRect();  // DOMRect border-box, read-only
				rtn = {
					left: rect.left,
					top: rect.top,
					width: rect.width,
					height: rect.height
				};
			}

			// adjust from layout to visual viewport
			offset = ownerView.fb && ownerView.fb.data.clientOrigin;
			if ( offset ) {
				rtn.left -= offset.left;
				rtn.top -= offset.top;
			}

			// translate coord origin from node's local viewport to requested viewport
			if ( ownerView != origin ) {
				offset = getViewOffset( ownerView, origin );
				rtn.left -= offset.left;
				rtn.top -= offset.top;
			}
		}

		// assign adjusted right/bottom and x,y center point
		rtn.right = rtn.left + rtn.width;
		rtn.bottom = rtn.top + rtn.height;
		rtn.x = rtn.left + rtn.width / 2;
		rtn.y = rtn.top + rtn.height / 2;

		return rtn;
	}  // getRect


	function getViewport ( view ) {
		// CSS { left, top, width, height } of the visual portal.
		view = view && getOwnerView( view ) || self;
		var
			$docEl = view.document.documentElement,
			vvp = view.visualViewport,
			rtn;

		rtn = vvp ? { left: vvp.pageLeft, top: vvp.pageTop, width: vvp.width, height: vvp.height }
			: {
				left: view.pageXOffset || 0,
				top: view.pageYOffset || 0,
				width: mathMin(
					$docEl.clientWidth || bigNumber,
					view.innerWidth || bigNumber
				),
				height: mathMin(
					$docEl.clientHeight || bigNumber,
					view.innerHeight || bigNumber
				)
			};

		return rtn;
	}  // getViewport


	function getStyle ( $el, name, numeric ) {
		// Returns getComputedStyle for css settings in effect.
		var
			shortNames = { padding: '', border: '-width', margin: '' },
			sides = [ 'left', 'bottom', 'right', 'top' ],
			query = {},
			rtn,
			getter,
			isShort,
			rules,
			val,
			i;

		if ( ( $el = $( $el ) ) ) {

			getter = self.getComputedStyle;
			getter = getter && getTagName( $el )
				? getter( $el )
				: $el.style;  // object with a style property, canvas animation uses this
			if ( getter ) {

				if ( name ) {

					if ( name in shortNames ) {
						isShort = numeric = true;
						i = sides.length;
						while( i-- ) {
							query[ sides[ i ] ] = name + '-' + sides[ i ] + shortNames[ name ];
						}
					}

					else {
						query[ name ] = name;
					}

					for ( name in query ) {
						rtn = getter[ camelCase( query[ name ] ) ];
						if ( numeric ) {
							rtn = getFloat( rtn );
						}
						query[ name ] = rtn;
					}

					if ( isShort ) {
						rtn = query;
					}
				}

				else {
					// no property name passed, return string of all rules assigned to this node
					// emulate cssText which doesn't work in Firefox, IE, Edge

					rtn = getter.cssText || '';  // webkit, blink
					if ( !rtn ) {
						rules = {};
						for ( name in getter ) {
							val =
								/[a-z]/i.test( name )  // ignore numbered
								&& [ 'cssText', 'length' ].indexOf( name ) < 0  // ignore meta
								&& getter[ name ];

							// interested only in set scalar values, not functions, empty strings etc.
							if ( ''+val === val && val || +val === val ) {
								rules[ camelCase( name, true ) ] = val;
								// firefox includes both camel and css names
							}
						}
						for ( name in rules ) {
							rtn += name + ':' + rules[ name ] + ';';
						}
					}

					// vendor-prefixed styles can cause problems when transferred to different elements
					rtn = patch( rtn, /-?(webkit|ms|moz)-[^;]+;/g, '' );
				}
			}
		}
		return rtn;
	}  // getStyle


	function setStyle ( $el, prop, val ) {
		// Set one or more styles on one or more elements,
		// handling various vagaries and special requirements.
		// arg1 and arg2 can be scalars of 'name' & 'value',
		// or arrays or objects of name/value pairings.
		$el = $( $el ) || select( $el );
		var
			$style,
			name,
			i;

		if ( isArray( $el ) ) {  // iterate multiple targets
			i = $el.length;
			while ( i-- ) {
				setStyle( $el[ i ], prop, val );
			}
		}

		else if ( ( $style = $el && $el.style ) ) {  // process one target

			if ( ''+prop === prop ) {  // scalar string property

				if ( +val === val ) {  // pixel values can be sent as numeric
					val += prop == 'opacity' || prop == 'zIndex' ? '' : 'px';
				}
				val = val ? '' + val : '';  // 0 to '0' and undefined to ''
				$style[ prop ] = val;
			}

			else {  // object
				for ( name in prop ) {
					setStyle( $el, name, prop[ name ] );
				}
			}
		}
	}  // setStyle


	function getInstance ( name, modal ) {
		// Return box instance requested by name
		// or top-most (modal?) box instance if 'name' is not provided.
		var
			maxOrder = -1,
			rtn,
			instance,
			i;

		i = instances.length;
		while ( i-- ) {
			instance = instances[ i ];
			if ( instance && instance.state ) {

				if ( name ) {
					if ( instance.name == name ) {
						rtn = instance;
					}
				}

				else if ( instance.stackOrder > maxOrder
					&& ( !modal || instance.isModal )
				) {
					maxOrder = instance.stackOrder;
					rtn = instance;
				}
			}
		}

		return rtn;
	}  // getInstance


	function getOwnerInstance ( $node ) {
		// Return box instance that contains this node (or undefined).
		var
			instance,
			view,
			i;

		i = instances.length;
		while ( i-- ) {
			instance = instances[ i ];
			if ( instance && instance.state ) {
				view = instance.fbContent && instance.fbContent.contentWindow;  // if it's an iframe
				// find a direct descendant of an existing box, or in an iframe inside this box
				if ( nodeContains( instance.fbMain, $node )  // the box or a direct descendant
					|| $node == view  // the window object in an iframe (may be x-domain)
					|| getOwnerView( $node ) == view  // won't match x-domain elements
				) {
					return instance;
				}
			}
		}
	}  // getOwnerInstance


	function nodeContains ( $host, $guest ) {
		// Boolean: $host.contains( $guest ).
		// Will move window and document requests to the html element and will recurse iframes.
		$host = $( $host );
		$guest = $( $guest );
		var
			hostView = getOwnerView( $host ),
			guestView = getOwnerView( $guest ),
			rtn;

		if ( hostView && guestView ) {

			// change window and document references to the html element
			if ( $host == hostView || $host == hostView.document ) {
				$host = hostView.document.documentElement;
			}
			if ( $guest == guestView || $guest == guestView.document ) {
				$guest = guestView.document.documentElement;
			}

			if ( !getTagName( $guest ) ) {  // maybe a text node
				$guest = $guest.parentElement;
			}

			rtn = guestView == hostView ? $host.contains( $guest )
				: nodeContains( $host, guestView.frameElement );  // check inside an iframe
		}
		return rtn;
	}  // nodeContains


	function start ( source, apiSettings ) {
		// All floatboxes, including tooltips and contexts, start life here.
		apiSettings = parseOptions( apiSettings );  // to object
		source = source ? items[ source.fbx ] || source : apiSettings.source;
		var
			startItem,
			startSettings,
			boxContent,
			inlineContent,
			firstSource,
			topBox,
			sameBox,
			instance,
			item,
			alreadyShowing,
			i;

		if ( source ) {

			if ( !isArray( source ) ) {
				source = [ source ];
			}
			i = source.length;
			while ( i-- ) {
				// iterate down to the first one, but activate the others along the way
				if ( ( firstSource = source[ i ] ) ) {
					startItem = firstSource.boxContent ? firstSource
						: activateItem( firstSource, true, apiSettings );
						// true tells getCurrentSet to assign ownerBox
				}
			}

			if ( ( boxContent = startItem && startItem.boxContent ) ) {
				// copy startItem's settings so the original won't get modified
				startSettings = extend( {},
					startItem.itemSettings,
					apiSettings
				);

				// look for a showable item if showThis is false
				if ( !startItem.canShow ) {
					i = items.length;
					while ( i--
						&& !( startItem.canShow && startItem.boxContent == boxContent )
					) {
						item = items[ i ];
						if ( item && item.itemSettings.group == startSettings.group ) {
							// keep assigning group members until we reach a
							// matching showable item or the first member
							startItem = item;
						}
					}

					// options on the showThis:false item take precedence
					extend( startSettings, startItem.itemSettings, firstSource.itemSettings );
				}

				// open content in a new window if requested, most commonly set in mobile options
				if ( startSettings.newWindow ) {
					inlineContent = wrappers[ boxContent ];
					newWindow( startItem.isUrl
						? boxContent
						: makeOuterHtml(
							'body',
							inlineContent && inlineContent.outerHTML || boxContent
						)
					);
				}

				else {  // normal show in a box

					if ( ( topBox = getInstance() ) ) {  // there's an existing open box

						// if siblings and trying to start an already-open item,
						// just move that item to the top
						if ( !topBox.isModal ) {
							i = instances.length;
							while ( i-- ) {
								instance = instances[ i ];
								item = instance && instance.activeItem;
								if ( item
									&& !instance.isModal
									&& item.boxContent == boxContent
									&& item.hostEl == startItem.hostEl
								) {
									instance.restack();
									alreadyShowing = true;  // don't boot
								}
							}
						}

						// check for a sameBox load request
						sameBox = startSettings.sameBox
							&& topBox.activeItem
							&& !topBox.activeItem.isContip;  // can't re-use a context or tooltip
					}

					if ( !alreadyShowing ) {
						if ( !sameBox ) {
							topBox = newBox( startSettings.modal !== false );
						}
						// give the document mousedown handler time to capture click coords
						setTimer( [ topBox.boot, sameBox, startItem, startSettings ] );
					}
				}
			}
		}
	}  // start


	function ajax ( source, params ) {
		// A clean interface to the XMLHttpRequest object.
		// source: required string url of file to be fetched.
		// params:
		//   $:  node or id to set innerHTML
		//   postData:  data to be posted - querystring, js object, or form node, id, or name
		//   success(result):  function - receives extended xhr object as its only passed parameter
		//   failure(result):  function - receives extended xhr object as its only passed parameter
		//   finish(result):  completion callback - fires whether the request was successful or not
		//   headers:  {object} of name:value pairs of custom request headers
		//   cacheable:  boolean - defaults to true, allowing browsers to cache results
		//   timeout:  abort after timeout milliseconds (finish will fire with result.status === 0)
		//   source: legacy, earlier versions used a 'source' params property (also aliased as 'url')
		if ( typeOf( source, 'object' ) ) {  // allow a single object argument
			params = source;
			source = params.source || params.url;
		}
		params = params || {};
		var
			xhr = 'XMLHttpRequest',
			onDone = params.failure,
			postData = params.postData,
			headers = params.headers || {},
			$updateNode = $( params.$ || params.updateNode ),  // .updateNode is legacy syntax
			header;

		try {

			source = parseUrl( source,
				params.cacheable === false && { no_cache: now() }  // perhaps modify the query string
			);
			if ( source.host == locationUrl.host ) {
				headers[ 'X-Requested-With' ] = xhr;
			}

			if ( postData ) {
				postData = serialize( postData ) || postData;  // can be a form, object or string
				headers[ 'Content-Type' ] = 'application/x-www-form-urlencoded';
			}

			xhr = new self[ xhr ]();
			xhr.open( postData ? 'POST' : 'GET', source.fullUrl );

			for ( header in headers ) {
				xhr.setRequestHeader( header, headers[ header ] );
			}

			if ( params.timeout ) {  // set a requested abort timeout
				setTimer( xhr.abort, +params.timeout, source.fullUrl );
			}

			xhr.onreadystatechange = function () {
				var
					result = {},
					status;

				if ( xhr.readyState == 4 ) {

					clearTimer( source.fullUrl );  // abort pending abort
					extend( result, xhr, { responseJSON: parseJSON( xhr.responseText ) } );
					status = result.status;

					if ( /^2|304/.test( status ) ) {
						if ( getTagName( $updateNode ) ) {
							setContent( $updateNode, result.responseText, true );
							activate( $updateNode );
						}
						onDone = params.success;
					}

					trigger( status && onDone, result );  // status == 0 if abort was called
					trigger( params.finish || params.callback, result );
					// finish always runs - on success, failure and abort (.callback is legacy)
				}
			};

			xhr.send( postData );
		}

		catch ( _ ) {
			trigger( onDone, xhr );  // onDone will still be params.failure
		}
	}  // ajax


	function getFormValues ( $form ) {
		$form = document.forms[ $form ] || $( $form );
		// Build object from Form fields.
		// www.w3.org/TR/html401/interact/forms.html
		var
			rtn = {},
			radioDone = {},
			elements,
			$el,
			name,
			value,
			tagName,
			type,
			members,
			$member,
			imgRect,
			border,
			i, j;

		if ( getTagName( $form, 'form' ) ) {

			elements = select( '*', $form );  // $form.elements does not include image inputs
			for ( i = 0; i < elements.length; i++ ) {
				$el = elements[ i ];
				if ( ( name = !$el.disabled && $el.name ) ) {
					// nameless and disabled elements never get submitted

					value = $el.value;
					tagName = getTagName( $el );
					type = ( attr( $el, 'type' ) || '' ).toLowerCase();
					imgRect = undefined;

					if ( tapInfo.type && nodeContains( $el, tapInfo.$ ) ) {
						if ( type == 'image' ) {
							// .x and .y relative click coords
							if ( tapInfo.type == 'keydown' ) {
								imgRect = { left: tapInfo.x, top: tapInfo.y };
							}
							else {
								imgRect = getRect( $el );
								border = getStyle( $el, 'border' );
								imgRect.left += border.left;
								imgRect.top += border.top;
							}
						}
						tagName = type = 'input';  // let used submit and image elements through
					}

					// all input
					if ( tagName == 'input' ) {
						if ( [ 'file', 'image', 'reset', 'submit' ].indexOf( type ) < 0 ) {  // ignore these
							// input: radio
							// processed as a set
							if ( type == 'radio' ) {
								if ( radioDone[ name ] ) {
									name = undefined;
								}
								else {

									radioDone[ name ] = true;
									value = undefined;
									members = select( 'input[name="' + name + '"]', $form );

									j = members.length;
									while ( !value && j-- ) {
										if ( members[ j ].checked ) {
											value = members[ j ].value;
										}
									}

									if ( !value ) {
										name = undefined;  // no radio buttons were checked
									}
								}
							}

							// input: checkbox
							else if ( type == 'checkbox' ) {
								if ( $el.checked ) {
									value = value || 'on';
								}
								else {
									name = undefined;
								}
							}

							// input: the above + text, password, hidden, & arbitrary type
							if ( name ) {
								if ( imgRect ) {  // image coords
									rtn[ name + '.x' ] = mathRound( tapInfo.x - imgRect.left );
									rtn[ name + '.y' ] = mathRound( tapInfo.y - imgRect.top );
								}
								else {
									multiAssign( rtn, name, value );
								}
							}
						}
					}

					// select
					else if ( tagName == 'select' ) {

						members = select( 'option', $el );  // option elements in this select
						for ( j = 0; j < members.length; j++ ) {
							$member = members[ j ];

							if ( $member.selected ) {
								multiAssign( rtn, name,
									attr( $member, 'value' ) !== null ? $member.value : $member.text
								);
							}
						}
					}

					// textarea
					else if ( tagName == 'textarea' ) {
						rtn[ name ] = value;
					}
				}
			}
		}
		return rtn;
	}  // getFormValues


	function animate ( props, then, duration, inflection, easing, monitor ) {
		// CSS animated transitions, with canvas assistance for cyclers.
		// 'props' is a singleton or array of objects containing mandatory $:domElem(s)
		//  and any number of propName:cssVal entries.
		duration = +duration === duration ? duration
			: ifNotSet( baseSettings.animationTime, 1 );  // default animation time
		inflection = +inflection === inflection ? inflection
			: ifNotSet( baseSettings.inflection, 0.5 );  // default easing inflection point
		easing = +easing === easing ? easing
			: ifNotSet( baseSettings.easing, 2.5 );  // default easing strength
		var
			monitorIsFunction = typeOf( monitor, 'function' ),
			status = !monitor || monitorIsFunction ? {} : monitor,
			// scale the acceleration curve prior to the inflection point
			easeScale1 = inflection / mathPow( inflection, easing ) || 1,
			// and after
			easeScale2 = ( 1 - inflection ) / mathPow( 1 - inflection, easing ) || 1,
			maxDiff = 0,
			requests = [],
			$els,
			$el,
			descriptor,
			startVal,
			delta,
			name,
			val,
			startTime,
			thisTime,
			lastTime,
			i, j;

		// unpack the arguments
		if ( !isArray( props ) ) {
			// can accept a singleton descriptor object
			props = [ props ];
		}
		for ( i = 0; i < props.length; i++ ) {

			descriptor = props[ i ];

			// $ param can be node ref, node id, array of node refs and ids, or a selector string
			if ( ( $els = $( descriptor.$ ) || select( descriptor.$ ) ) ) {
				if ( !isArray( $els ) ) {
					$els = [ $els ];
				}

				// capture arrays of [ node, property, startVal, delta ]
				for ( name in descriptor ) {
					if ( name != '$' ) {

						for ( j = 0; j < $els.length; j++ ) {
							if ( ( $el = $( $els[ j ] ) ) ) {

								val = descriptor[ name ];
								startVal = getStyle( $el,
									name == 'borderWidth' ? 'borderLeftWidth' : name,
									true
								);
								delta = val - startVal;

								maxDiff = mathMax( maxDiff,
									mathAbs( delta ) * ( name == 'opacity' ? 700 : 1 )
									// opacity changes use requested duration
								);
								requests.push( [  // one array for each property to be set
									$el,
									camelCase( name ),
									startVal,
									delta
								] );
							}
						}
					}
				}
			}
		}

		// scale animation duration given as seconds to the magnitude of change
		// (scale of 1 at 700px)
		duration = getFloat( duration );
		if ( duration < 77 ) {  // >= 77 assumed to be exact msec request
			duration *= 999 * mathPow( mathMin( maxDiff, 1500 ) / 700, 0.5 );  // msecs
		}

		// initialize monitor status and start animating
		status.step = 0;
		status.active = true;
		step();

		function step () {
		// apply requested values for this increment and set timer request for next increment
			var
				easeStep,
				canvasInfo,
				fraction,
				i;

			if ( monitorIsFunction ) {
				monitor( status );
			}

			thisTime = now();
			if ( !startTime ) {
				startTime = lastTime = thisTime - 7;
				// -7 because there's no point wasting this first pass by drawing a zero increment
			}

			canvasInfo = {};
			fraction = mathMin( 1,  // don't go past the end values
				duration ? mathMax( status.step, ( thisTime - startTime ) / duration ) : 1
				// check status.step for a mid-flight jump to completion
			);

			// set a request or timer for the next iteration
			if ( fraction < 1 ) {
				( self.requestAnimationFrame || setTimer )( step );  // only IE9 needs setTimer
			}

			// allow caller to suspend animation by setting status.active=falsey
			if ( fraction < 1 && ( document.hidden || !status.active ) ) {
				startTime += thisTime - lastTime;  // adjust startTime so we resume at the same step
			}

		// draw this step
			else {

				status.step = fraction;
				easeStep = easing == 1
					? fraction  // faster if not easing
					: fraction < inflection
					? easeScale1 * mathPow( fraction, easing )  // easing formula
					: 1 - easeScale2 * mathPow( 1 - fraction, easing );  // reverse easing formula

				for ( i = 0; i < requests.length; i++ ) {
					var
						request = requests[ i ],
						$el = request[ 0 ],
						prop = request[ 1 ],
						startVal = request[ 2 ],
						delta = request[ 3 ];

					// canvas from fbCycler
					if ( $el.canvas ) {

						// use compound interest formula to zoom as a steady % of interim size
						// (not used because it's detectable only on ridiculously large zooms)
						// M = P( 1 + i )^n
						// currentVal = startVal( 1 + delta/startVal )^currentFraction

						// gather property values for subsequent all-at-once drawing
						canvasInfo.$ = $el;  // the 2d context
						canvasInfo[ prop ] = startVal + delta * easeStep;
					}

					// standard css animate request
					else {
						setStyle( $el, prop,
							startVal + delta * ( prop == 'opacity' ? fraction : easeStep )
						);
					}
				}

			// draw a canvas image if requested
				descriptor = canvasInfo.$;
				if ( descriptor && descriptor.img && descriptor.img.src ) {
					descriptor.drawImage(
						descriptor.img,
						canvasInfo.left,
						canvasInfo.top,
						canvasInfo.width,
						canvasInfo.height
					);
				}
			}

			lastTime = thisTime;  // for next time

			if ( fraction >= 1 ) {  // we're done
				status.active = false;
				status.step = 1;
				trigger( then );
			}
		}  // step

	}  // animate


	function preload ( source, then ) {
		// Preload/cache images
		var
			path404 = resourcesFolder + '404.png',
			imgs = [],  // starts off with "path"s, then <img src="path">
			src,
			i;

		function fetch ( idx, src ) {
			var
				isComplete,
				i;

			function onLoadOrError ( e ) {
				var
					$img = this,
					img404 = $img.src.indexOf( path404 ) > -1;

				// success
				if ( e.type == 'load' || img404 ) {  // don't retry if the 404 image 404'd too
					$img.ok = !img404;
					$img.onload = $img.onerror = undefined;
					preloads[ src ] = $img;
					fetch( idx, src );  // check for completion of this request
				}

				// failure
				else {
					attr( $img, {  // remove broken-image dims
						width: null,
						height: null
					} );
					$img.src = path404;
				}
			}  // onLoadError

			// get previously cached img from our preloads object
			if ( preloads[ src ] ) {
				imgs[ idx ] = preloads[ src ];

				// check if all images in this request array have been fetched
				isComplete = true;
				i = imgs.length;
				while ( i-- ) {
					isComplete = isComplete && typeOf( imgs[ i ].ok, 'boolean' );
				}

				// run the callback when all images are ready
				if ( isComplete ) {
					trigger( isArray( then ) ? then
						: [ then, imgs[ 1 ] ? imgs : imgs[ 0 ] ]  // call with array if more than one img
					);
				}
			}

			// not previously fetched, go get it
			else {
				imgs[ idx ] = newElement( 'img' );
				imgs[ idx ].onload = imgs[ idx ].onerror = onLoadOrError;
				imgs[ idx ].src = src;  // initiate network fetch
			}
		}  // fetch

		// start with an array
		if ( !isArray( source ) ) {
			source = [ source ];
		}

		// build local array of requested src paths (maybe from an existing <img>'s src param)
		for ( i = 0 ; i < source.length; i++ ) {  // original order for callback param
			src = source[ i ];
			if ( src ) {
				imgs.push( src.src || src );
			}
		}

		// run the callback for empty source request
		if ( !imgs.length ) {
			trigger( then );
		}

		// fetch info from the global preloads object or the img from the network if not yet cached
		for ( i = 0; i < imgs.length; i++ ) {
			fetch( i, imgs[ i ] );
		}
	}  // preload


	function printNode ( $node, printCSS, activeSettings ) {
		// Copy an element into a new window and fire up the new window's print dialog.
		$node = $( $node ) || {};
		var
			styles = '',
			content = $node.outerHTML,
			isIframe = getTagName( $node, 'iframe' ),
			view = getOwnerView(  // does the x-domain checking
				isIframe ? $node.contentWindow : $node
			),
			doc = view && view.document,
			printWindow,  // for printDialog
			bodyStyle,
			base,
			script,
			$styleNodes,
			i;

		data.printDialog = function () {
			printWindow = this;  // the print window global object

			// show the print dialog
			printWindow.document.body.focus();
			if ( trigger( activeSettings.beforePrint, printWindow ) !== false ) {
				setTimer( function () {  // presto needed a new thread, maybe safer for others too
					printWindow.print();
					printWindow.close();
				} );
			}
		};

		if ( doc ) {

			if ( isIframe ) {
				$node = doc.body;  // the iframe body is our node to print
				content = $node.innerHTML;
				bodyStyle = attr( $node, 'style' );
				bodyStyle = bodyStyle && bodyStyle.cssText || bodyStyle;
			}

			// add a <base /> element so relative references will keep working in the new window
			base = makeOuterHtml( 'base', false, [ 'href', parseUrl( view.location.href ).baseUrl ] );

			// remove scripts and add body element style attribute
			content = makeOuterHtml( 'body',
				patch( content, /<script[^>]*>([\s\S]*?)<\/script>/gi, '' ),
				[ 'style', bodyStyle ]
			);

			// new window's onload function
			script = makeOuterHtml( 'script',
				'opener.fb.addEvent(self,"load",opener.fb.data.printDialog)'
			);

			// get linked stylesheets and inline style definitions
			$styleNodes = select( [ 'link', 'style' ], doc );
			for ( i = 0; i < $styleNodes.length; i++ ) {
				styles += $styleNodes[ i ].outerHTML;
			}
			// followed by plain styling enforcement
			styles +=
				makeOuterHtml( 'style',
					'html,body{border:0;margin:0;padding:0}'
					+ ( isIframe ? 'html' : 'body' )
					+ '{background:'
					+ getStyle( $node.parentElement, 'backgroundColor' )  // overrides background-image
					+ '}'
				);

			// optional passed param "printCSS" can be a css file path or a string of style definitions
			if ( printCSS ) {
				if ( /\.css(\?|$)/i.test( printCSS ) ) {
					styles += makeOuterHtml( 'link', false, [
						'rel', 'stylesheet',
						'href', printCSS
					] );
				}
				else {
					styles += makeOuterHtml( 'style', printCSS );
				}
			}

			// print from a new browser window
			newWindow( makeOuterHtml( 'head', base + styles + script ) + content );
		}
	}  // printNode


	function parseJSON ( str ) {
		// Objectify a JSON string.
		// Fail returns undefined.

		try {
			return self.JSON.parse( str );
		}
		catch ( _ ) { }
	}  // parseJSON


	function getByClass ( classes, $node, nth ) {
		classes = classes || '';
		// Select by class, legacy function superceded by fb.select.

		// an array of class names will match any (or'd together)
		if ( isArray( classes ) ) {
			classes = classes.join( ',.' );
		}

		// a string class name must match all of them (and'd together)
		else {
			classes = patch( classes, /\s+/g, '.' );
		}

		return select( '.' + classes, $node, nth );
	}  // getByClass


	function getLayout ( $node, local ) {
		// Legacy API function
		// Adds objects of margin, border and padding values to getRect results.
		return extend( {
				padding: getStyle( $node, 'padding' ),
				border: getStyle( $node, 'border' ),
				margin: getStyle( $node, 'margin' )
			},
			getRect( $node, !local && topView )
		);
	}  // getLayout

///  end api functions


///  begin page event handlers

	function tapHandler ( e, viewX, viewY ) {
		// User input monitoring.
		// Sets global tapInfo object as follows:
		//   type: 'touchstart' | 'mousedown' | 'keydown'
		//   $: e.target
		//   x: clientX
		//   y: clientY
		// Also keeps fb.usingTouch current.

		if ( !e ) {
			// cancelled by timer (tap held down too long),
			// multi-touch, or by code as a stopEvent cheater
			tapInfo.type = undefined;
			if ( self != topView ) {
				topData.tapHandler();
			}
		}
		else {
			var
				type = e.type,
				tap = e.changedTouches && e.changedTouches[ 0 ] || e,
				$ = tap.target,
				clientX = tap.clientX - ( viewX || 0 ),  // might be NaN
				clientY = tap.clientY - ( viewY || 0 ),
				keyCode = tap.keyCode,
				rect,
				ownerStack,
				instance,
				x,
				y,
				i;

			// ignore scrollbar clicks
			if ( $ == document.documentElement ) {
				type = undefined;
			}

			// adjust client coords for mobile (android) screen zoom
			if ( +viewX !== viewX ) {  // not already adjusted by getViewOffset->getRect
				clientX -= clientOrigin.left;
				clientY -= clientOrigin.top;
			}

			if ( type == 'touchstart' || type == 'mousedown' && !tapInfo.type ) {
				// ignore psuedo mousedown following a touchstart event

				fb.usingTouch = usingTouch = type == 'touchstart';
				// must set it each time to support hybrid devices using both touch and mouse

				if ( usingTouch ) {
					if ( e.touches[ 1 ] ) {  // multi-touch
						tapHandler();  // cancel tap
					}
					else {
						x = clientX;
						y = clientY;
					}
				}

				else if ( !tap.button ) {  // mousedown left click
					x = clientX;
					y = clientY;
				}
			}

			else if ( type == 'keydown'
				&& ( keyCode == 13 || keyCode == 27 || keyCode == 32 )  // enter,esc,space
			) {
				rect = getRect( $ );
				x = rect.x - ( viewX || 0 );
				y = rect.y - ( viewY || 0 );
			}

			else if ( type == 'touchend' || type == 'mouseup' && !usingTouch ) {

				// cancel tap if user is swiping
				if ( tapInfo.type ) {
					clientX -= tapInfo.x;
					clientY -= tapInfo.y;
					if ( clientX * clientX + clientY * clientY > 64 ) {  // moved more than 8px
						tapHandler();
					}
				}

				else if ( usingTouch && !e.touches.length ) {
					// fire viewportHandler at conclusion of two-finger pinch zooms
					viewportHandler();
				}

				// process outsideClickCloses requests
				if ( $ && tapInfo.type && !tap.button ) {

					popupHideAll( $ );  // close any pop thumbs, except the current target
					ownerStack = getOwnerInstance( $ );
					ownerStack = ownerStack && ownerStack.stackOrder || 0;
					i = instances.length;
					while ( i-- ) {  // backwards to stay above the first modal box
						if ( ( instance = instances[ i ] ) ) {

							if ( instance.outerClickCloses || instance.state == STATE_boot ) {
								if ( tapInfo.type
									&& instance.stackOrder > ownerStack
										// can't close a box by clicking in it or a box above it
									&& !nodeContains( instance.activeItem.hostEl, $ )
										// not on starting link
									|| instance.activeItem.isTooltip && usingTouch
										// touch anywhere for tooltips
								) {
									instance.end();
								}
							}

							if ( instance.isModal ) {
								i = 0;  // don't look underneath modal boxes
							}
						}
					}
				}
			}

			if ( +x === x ) {

				// don't retain stale click info
				setTimer( tapHandler, 555, TIMER_tap );

				// capture event details
				extend( tapInfo, {
					type: type,
					$: $,
					x: x,
					y: y
				} );

				// propagate taps in a frame down to the top view
				if ( self != topView ) {
					rect = getViewOffset( self, topView );
					topData.tapHandler( e, rect.left, rect.top );
				}
			}
		}
	}  // tapHandler


	function viewportHandler ( e ) {
		// Monitors window scroll and resize changes.
		// Maintains 'global' viewport and virtual screen metrics.
		// Re-centers open boxes.

		// clientOrigin:
		//   iOS and desktops report client metrics (getBCR, event.clientX/Y) relative to the visual viewport.
		//   Android reports those same metrics relative to the layout viewport.
		//   Subtract clientOrigin values calculated below from the reported client measurements
		//   to get visual viewport position.
		// visualOrigin:
		//   Both platforms set css fixed position left and top to the layout, not visual viewport.
		//   Add visualOrigin values to fixed position left and top to move them into the visual viewport space.
		// The above platform references are likely incomplete and out of date
		// but that's ok because we're using behaviour detection, not browser sniffing.
		var
			$docEl,
			metrics,
			margin,
			$div,
			$childDiv,
			i;

		if ( e ) {  // from event handler
			// wait until activity stops before updating viewport metrics and running keepCentered
			setTimer( viewportHandler, 300, TIMER_viewport );
		}

		else {  // from the last timer (or called directly)

			extend( viewport, getViewport() );  // update, not assign, because fb.viewport

			// measure client metrics displacement (android only, iOS will report 0)
			if ( self == top ) {
				$docEl = document.documentElement;
				metrics = $docEl.getBoundingClientRect();
				margin = getStyle( $docEl, 'margin' );
				extend( clientOrigin, {
					left: viewport.left + metrics.left - margin.left,
					top: viewport.top + metrics.top - margin.top
				} );
			}

			// measure fixed element displacement (iOS only, android will report 0)
			$div = newElement( 'div' );
			setStyle( $div, {
				position: 'fixed',
				left: 0,
				top: 0,
				width: 77,
				height: 77
			} );
			placeElement( $div, document.body );
			metrics = $div.getBoundingClientRect();
			extend( visualOrigin, {
				left: mathMax( -metrics.left, clientOrigin.left ),
				top: mathMax( -metrics.top, clientOrigin.top )
			} );

			// measure scrollbar here to account for current document scale
			$childDiv = newElement( 'div' );
			setStyle( $childDiv, { width: '100%', height: '100%' } );
			placeElement( $childDiv, $div );
			setStyle( $div, 'overflow', 'hidden' );
			scrollbarSize = getRect( $childDiv ).width;
			setStyle( $div, 'overflow', 'scroll' );
			scrollbarSize -= getRect( $childDiv ).width;
			placeElement( $div );

			// keepCentered

			if ( self == topView ) {

				if ( !previousViewport ) {
					previousViewport = extend( viewport );
				}

				if ( mathAbs( previousViewport.width - viewport.width ) > scrollbarSize + 7
					|| mathAbs( previousViewport.left - viewport.left ) > 17
					|| mathAbs( previousViewport.top - viewport.top ) > 17
				) {
					i = instances.length;
					while ( i-- ) {
						if ( instances[ i ] ) {
							instances[ i ].resize( true );
						}
					}

					previousViewport = extend( viewport );
				}
			}
		}
	}  // viewportHandler


	function messageHandler ( e ) {
		// Message handler for video auto-end
		var
			data = parseJSON( e && e.data ),
			msg = data && data.event,
			instance;

		if ( msg ) {

			if ( ( instance = getOwnerInstance( e.source ) ) ) {  // from one of our videos

				// subscribe to vimeo's finish event
				if ( msg == 'ready' ) {
					e.source.postMessage( '{"method":"addEventListener","value":"finish"}', e.origin );
				}

				// look for finished notification
				else if ( msg == 'end' ) {  // esc key from fb.video
					instance.end();
				}
				else if ( msg == 'finish'  // msg from fb and vimeo
					|| data.info && data.info.playerState === 0  // playerState from youtube
				) {
					if ( instance.itemCount == 1 && instance.activeItem.itemSettings.autoEndVideo ) {
						instance.end();
					}
					else if ( instance.isSlideshow ) {
						instance.showItem();
					}
				}
			}
		}
	}  // messageHandler


	function clickHandler ( e ) {
		// Standard floatbox link click-launcher

		if ( !( e.ctrlKey || e.metaKey || e.shiftKey || e.altKey ) ) {
			stopEvent( e );
			topView.fb.start( this );
		}
	}  // clickHandler

///  end page event handlers


///  begin internal functions

	function activateItem ( boxContent, ownerBox, apiSettings ) {
		// Determine content type, add to items array, and look for autoStart.
		// 'boxContent' may be <a> or <area> link, strHref, str#HiddenDivId or strHtml,
		// (always a link when called from activate).
		apiSettings = apiSettings || {};
		var
			item = {},
			itemSettings = {},  // aggregate of all settings - base, type, subtype, class, link, api
			linkSettings = {},
			itemTypeSettings = {},
			itemClassSettings = {},
			tagName,
			$link,
			contentType,
			url,
			isImage,
			isVideo,
			isMedia,
			isInline,
			isAjax,
			isDirect,
			isHtml,
			isIframe,
			isUrl,
			isXSite,
			boxName,
			$thumb,
			$el,
			classNames,
			setting,
			i;

		// parse out a $link, normally a clicked one
		tagName = getTagName( boxContent, [ 'a', 'area' ] );
		if ( ( $link = tagName && boxContent ) ) {
			$thumb = tagName == 'a' ? select( 'img', $link, 0 ) : $link;
			linkSettings = parseOptions( $link );
			addClass( linkSettings, getClass( $link ) );
			boxContent = $link.parentElement && $link.href;  // ensure link is still attached
		}

		// gather all the assigned classNames
		// inherited ones were pushed to the link's options by activate
		addClass( itemSettings, [
			linkSettings.className,
			apiSettings.className,
			baseSettings.className,
		] );

		// and classSettings
		classNames = ( itemSettings.className || '' ).split( ' ' );
		i = classNames.length;
		while ( i-- ) {  // precedence to first listed classes (ltr)
			extend( itemClassSettings, classSettings[ classNames[ i ] ] );
		}

		// build preliminary itemSettings so we can determine type and finalize boxContent
		extend( itemSettings,
			baseSettings,
			parseOptions( apiSettings.contipSettings || attr( $link, 'data-fb' ) ),
			itemClassSettings,
			linkSettings,
			apiSettings
		);

		if ( ( boxContent = itemSettings.source || boxContent ) ) {

			// figure out content type (and maybe update boxContent)
			contentType = itemSettings.type;  // may be corrected

			// direct html content
			if ( /<.+>/.test( boxContent ) ) {
				boxContent = makeOuterHtml( 'div', boxContent );
				contentType = 'direct';
			}

			else {

				// absolutize the boxContent url and capture some path info
				url = parseUrl( decodeHTML( boxContent ) );

				// hidden div content
				if ( $( url.hash ) ) {
					boxContent = url.hash;
					boxName = patch( boxContent, '#', '' );
					contentType = 'inline';
				}

				// type based on file path
				else {
					boxName = url.fileName;
					boxContent = url.fullUrl;
					contentType = contentType || url.fileType;
				}
			}

			isImage = contentType == 'image';
			isVideo = contentType == 'video';
			isMedia = isImage || isVideo;
			isInline = contentType == 'inline';
			isAjax = contentType == 'ajax';
			isDirect = contentType == 'direct';
			isHtml = isInline || isAjax || isDirect;
			isIframe = !isImage && !isHtml;  // default type, includes video and pdf
			isUrl = !isInline && !isDirect;
			isXSite = isIframe && (  // exempt from measuring
				isVideo || contentType == 'pdf' || url.host != topUrl.host
			);

			if ( isIframe && !isXSite ) {
				boxContent = url.noHash;  // drop the hash so webkit won't scroll the base page too
				item.scrollHash = url.hash;
			}

			// gather type settings
			extend( itemTypeSettings,
				typeSettings[ ( isHtml || isIframe ) && !isVideo && 'html' ],
				typeSettings[ contentType ]
			);

			// redo class settings for any new classNames assigned by type or other className options
			addClass( itemSettings, [
				itemTypeSettings.className,
				itemClassSettings.className
			] );
			classNames = ( itemSettings.className || '' ).split( ' ' );
			i = classNames.length;
			while ( i-- ) {
				extend( itemClassSettings, classSettings[ classNames[ i ] ] );
			}

			// finalize itemSettings (base, contip and inherited settings retained from above)
			extend(
				itemSettings,
				itemTypeSettings,
				itemClassSettings,
				linkSettings,
				apiSettings
			);

			// capture various item details
			extend( item, {
				boxContent: boxContent,
				itemSettings: itemSettings,
				canShow: itemSettings.showThis !== false,
				boxName: boxName || '',
				ownerBox: ownerBox || getOwnerInstance( $link ),
				hostEl: $link,
				thumbEl: $thumb,
				playButton: itemSettings.addPlayButton,
				isImage: isImage,
				isVideo: isVideo,
				isMedia: isMedia,
				isAjax: isAjax,
				isHtml: isHtml,
				isIframe: isIframe,
				isUrl: isUrl,
				isXSite: isXSite
			} );

			setting = attr( $thumb, 'data-fb-src' );  // pending src attribute in cycler sets
			item.thumbSrc = setting != 'src' && setting || $thumb && $thumb.src;

			// handle titleAsCaption and altAsCaption
			setting = itemSettings.titleAsCaption;
			itemSettings.caption = ifNotSet( itemSettings.caption,
				setting !== false
				&& (
					setting != 'img' && attr( $link, 'title' )
					|| setting != 'a' && attr( $thumb, 'title' )
				)
				|| itemSettings.altAsCaption && attr( $thumb, 'alt' )
			);

			// finalize captions
			i = captionNames.length;
			while ( i-- ) {
				if ( ( setting = itemSettings[ captionNames[ i ] ] ) ) {

					// put wrapperDivs around inline caption sources
					$el = /^#[\S]+$/.test( setting ) && $( setting );
					if ( $el && !$el.parentElement.fbName ) {  // not already in use
						wrappers[ setting ] = wrapElement( $el );
					}

					// expand 'href' to cleaned-up file name
					else if ( setting == 'href' ) {
						setting = patch( boxName,
							/[_-]/g, ' ',
							/(^|\s)\w/g, function ( $0 ) { return $0.toUpperCase(); }
						);
					}

					// decode encoded html
					else if ( /&lt;.+&gt;/.test( setting ) ) {
						setting = decodeHTML( setting );
					}

					// encode plain text but not plain html
					else if ( !rexHtml.test( setting ) ) {
						setting = encodeHTML( setting );
					}

					itemSettings[ captionNames[ i ] ] = setting;
				}
			}

			// wrap inline content
			$el = $( boxContent );
			if ( $el && !$el.parentElement.fbName ) {
				wrappers[ boxContent ] = wrapElement( $el );
			}

			// queue images for preloading
			if ( item.isImage && preloadLimit > 0 ) {
				preloadLimit--;
				setTimer( [ preload, boxContent ] );
			}

			// prep video links requests
			if ( item.isVideo ) {
				videoPrep( item );  // will call videoAddThumb and videoAddPlay
			}
			else if ( item.playButton ) {
				videoAddPlay( item );
			}

			// activate non-api-start link
			if ( $link && ownerBox !== true ) {

				setting = locationUrl.query.autoStart;
				if ( setting && item.canShow && boxContent.indexOf( setting ) > -1
					|| !showAtLoad && itemSettings.autoStart
				) {
					showAtLoad = item;
				}

				if ( itemSettings.showMagCursor ) {
					setStyle( $link, 'cursor', zoomInCursor );
				}

				$link.fbx = items.length;  // put index on the link expando so start can find it
				addEvent( $link, 'onclick', clickHandler );  // use onclick to overwrite existing
			}

			items.push( item );
			return item;
		}
	}  // activateItem


	function wrapElement ( $el, type ) {
		// Wrap an element in another one, and return the wrapper
		var
			$parentEl = $el && $el.parentElement,
			$wrapper,
			display,
			visibility;

		if ( $parentEl ) {

			if ( hasClass( $parentEl, 'fbWrapper' ) ) {  // already wrapped?
				$wrapper = $parentEl;
			}

			else {
				$wrapper = newElement( type || 'div' );
				addClass( $wrapper, 'fbWrapper' );
				placeElement( $wrapper, $parentEl, $el );
				placeElement( $el, $wrapper );

				if ( !type ) {
					// transfer display and visibility to the wrapper node

					display = getStyle( $el, 'display' );
					visibility = getStyle( $el, 'visibility' );

					setStyle( $wrapper, {
						display: display,
						visibility: visibility,
						width: '100%',  // width and height helps some layouts when $el is visible
						height: '100%'
					} );

					setStyle( $el, {  // make node visible when transferred out of the wrapper
						display: display == 'none' ? 'inline-block' : display,
						visibility: 'inherit'
					} );
				}
			}
		}
		return $wrapper;
	}  // wrapElement


	function areaRect ( $node ) {
		// getRect for area elements.
		// Parse area coordinates relative to the img that is using the area map.
		var
			rtn,  // undefined on failure
			$host,
			minX = infinity,
			minY = infinity,
			maxX = 0,
			maxY = 0,
			rect,
			coords,
			shape,
			padding,
			border,
			x, y, z,
			i;

		$host = select( 'img[usemap="#' + $node.parentElement.name + '"]', $node.ownerDocument, 0 );
		if ( $host ) {  // no img, no position

			rtn = getRect( $host );
			coords = patch( attr( $node, 'coords' ) || '', /\s+/g, '' ).split( ',' );
			x = +coords[ 0 ];
			y = +coords[ 1 ];
			z = +coords[ 2 ];

			// get area bounds [ left, top, right, bottom ]
			shape = attr( $node, 'shape' );
			rect = shape == 'rect' ? [ x, y, z, +coords[ 3 ] ]  // x1,y1,x2,y2
				: shape == 'circle' ? [ x - z, y - z, x + z, y + z ]  // x,y,radius
				: shape == 'default' ? [ 0, 0, rtn.width, rtn.height ]  // the full image
				: 0;

			if ( !rect ) {  // it must be a poly - x1,y1,x2,y2,..,xn,yn

				// find min and max coords
				i = coords.length;
				while ( i-- ) {
					z = +coords[ i ];
					if ( i % 2 ) {  // odd index, y coordinate
						minY = mathMin( minY, z );
						maxY = mathMax( maxY, z );
					}
					else {  // even index, x coordinate
						minX = mathMin( minX, z );
						maxX = mathMax( maxX, z );
					}
				}

				rect = [
					minX == infinity ? 0 : minX,
					minY == infinity ? 0 : minY,
					maxX,
					maxY
				];
			}

			// add img padding, border and area coordinates to the img position
			border = getStyle( $host, 'border' );
			padding = getStyle( $host, 'padding' );
			rtn = {
				left: rtn.left + border.left + padding.left + rect[ 0 ],
				top: rtn.top + border.top + padding.top + rect[ 1 ],
				width: rect[ 2 ] - rect[ 0 ],
				height: rect[ 3 ] - rect[ 1 ]
			};
		}

		return rtn;
	}  // areaRect


	function getViewOffset ( thisView, thatView ) {
		// Coordinate space delta between two viewports.
		// offset is thatView's origin relative to thisView's origin.
		// thatView coord = thisView coord - offset
		// thisView coord = thatView coord + offset
		thisView = getOwnerView( thisView );
		thatView = getOwnerView( thatView );
		var
			delta = { left: 0, top: 0 },
			direction = 1,
			frame,
			rect,
			padding,
			border;

		if ( thisView && thatView && thisView != thatView ) {

			if ( nodeContains( thisView, thatView ) ) {

				while ( thisView != thatView ) {

					if ( ( frame = thatView.frameElement ) ) {

						rect = getRect( frame );
						padding = getStyle( frame, 'padding' );
						border = getStyle( frame, 'border' );
						delta.left += rect.left + padding.left + border.left;
						delta.top += rect.top + padding.top + border.top;

						thatView = getOwnerView( frame );  // next
					}

					else {  // something bad happened
						thatView = thisView;  // halt
					}
				}
			}

			else if ( nodeContains( thatView, thisView ) ) {
				// reverse the calcs from a reversed parent/child relationship

				direction = -1;
				delta = getViewOffset( thatView, thisView );

			}

			else {  // siblings, use delta offsets from top

				rect = getViewOffset( thisView, topView );  // from this to top
				delta.left += rect.left;
				delta.top += rect.top;

				rect = getViewOffset( topView, thatView );  // from top to that
				delta.left += rect.left;
				delta.top += rect.top;
			}
		}

		return { left: delta.left * direction, top: delta.top * direction };
	}  // getViewOffset


	function makeOuterHtml ( name, content, attrs ) {
		// Return html markup for an element.
		var
			rtn = '<' + name,
			i;

		if ( isArray( attrs ) ) {
			for ( i = 0; i < attrs.length; i += 2 ) {
				rtn += ' ' + attrs[ i ] + '="' + encodeHTML( attrs[ i + 1 ] ) + '"';
			}
		}
		rtn += content === false ? '/>' : '>' + ( content || '' ) + '</' + name + '>';
		return rtn;
	}  // makeOuterHtml


	function setContent ( $el, html, runScripts ) {
		// Set innerHTML and optionally run any scripts found in the incoming content.
		$el = $( $el );
		var
			scripts,
			i;

		if ( $el ) {
			$el.innerHTML = patch( ''+html, /(<script)\b/gi, '$1 type="off"' );
			// invalid type disables execution of scripts

			if ( runScripts ) {
				scripts = select( 'script', $el );
				for ( i = 0; i < scripts.length; i++ ) {
					require( scripts[ i ].src, scripts[ i ].text, true );
				}
			}
		}
	}  // setContent


	function setBorderRadius ( $el, radius, side, width ) {
		// Set CSS-3 round corners.
		var
			sides = {
				TopLeft: 'Top',
				TopRight: 'Right',
				BottomRight: 'Bottom',
				BottomLeft: 'Left'
			},
			propName,
			$parentEl,
			children;

		if ( !side ) {
			for ( side in sides ) {
				setBorderRadius( $el, radius, side, width );
			}
		}

		else {

			propName = 'border' + side + 'Radius';

			if ( radius === undefined ) {  // get radius from parent, adjusted for border-width
				$parentEl = $el.parentElement;

				// prefer radius values from style attribute,
				// browsers might have shrunk them to be no larger than the $el
				radius = ( getInt( $parentEl.style[ propName ] ) || getStyle( $parentEl, propName, true ) )
					- getStyle( $parentEl, 'border' + sides[ side ] + 'Width', true );
			}

			// set one corner
			setStyle( $el, propName, mathMax( 0, radius ) );

			// set immediate children if requested
			if ( +width === width ) {  // numeric request to set children, adjusted for border width
				children = select( '>div:not(.fbHeader):not(.fbFooter)', $el );
				while ( children.length ) {
					setBorderRadius( children.pop(), radius - width, side );
				}
			}
		}
	}  // setBorderRadius


	function scale ( currentWidth, currentHeight, targetWidth, targetHeight, ratio, fill, dir ) {
		// Clever little routine for calculating various dimension scaling scenarios.
		var
			limit = dir > 0 ? mathMax  // +ve dir, allow only upscale
				: dir < 0 ? mathMin  // -ve dir, allow only downscale
				: getFloat,  // allow either direction
			dx = limit( targetWidth - currentWidth, 0 ),
			dy = limit( targetHeight - currentHeight, 0 );

		if ( ratio ) {  // proportional width/height
			if ( ( dy * ratio - dx ) * ( fill ? 1 : -1 ) > 0 ) {
				// scale up if filling
				dx = dy * ratio;
			}
			else {
				// down if fitting
				dy = dx / ratio;
			}
		}

		return {
			width: currentWidth + dx,
			height: currentHeight + dy
		};
	}  // scale


	function newWindow ( source, nameless, params ) {
		// window.open wrapper.
		var
			isHtml = rexHtml.test( source ),
			view = self.open(
				isHtml ? '' : source,
				nameless ? '' : '_fb', params || ''
			),
			doc = view && view.document;

		if ( !doc ) {
			alert( strings[ STR_popup ] );
		}

		else if ( isHtml ) {
			doc.open( 'text/html' );
			doc.write( '<!DOCTYPE html>' + makeOuterHtml( 'html', source ) );
			doc.close();
		}

		return view;
	}  // newWindow


	function ifNotSet ( val, defaultVal, nullVal ) {
		// Return defaults or alternatives for undefined values.
		return (
			val ? val  // quick return for truthy values
			: val === undefined || val === '' || ''+val == 'NaN' ? defaultVal
			: val !== null ? val  // includes false and 0
			: nullVal !== undefined ? nullVal
			: +defaultVal === defaultVal ? 0  // number
			: val
		);
	}  // ifNotSet


	function resolvePercent ( quantity, of, defaultVal ) {
		// Handles % settings for size options.
		return (
			+quantity === quantity ? quantity  // plain numbers go back unchanged
			: /%/.test( quantity ) ? getFloat( quantity ) / 100 * of
			: defaultVal
		);
	}  // resolvePercent


	function runFromTopBox( funcName ) {
		// Shunts floatbox API calls on the fb object off to the topInstance for execution.

		return function ( a, b, c ) {  // 3 args for fb.resize
			var topBox = getInstance();

			if ( topBox ) {
				trigger( [ topBox[ funcName ], a, b, c ] );
			}
		};
	}  // runFromTopBox


	function maybeStart ( item ) {
		// Cookie management for autoStart:once requests set in activateItem
		// and showOnce tooltip starts from contipHandler.
		var
			itemSettings = item && item.itemSettings,
			fbCookie,
			contentHash;

		if ( itemSettings ) {

			if ( itemSettings.autoStart == 'once' || itemSettings.showOnce ) {
				fbCookie = parseOptions( topDoc.cookie ).fb || '';
				contentHash = '|' + getHash( item.boxContent );

				if ( fbCookie.indexOf( contentHash ) > -1 ) {
					item = undefined;  // already shown
				}
				else {
					topDoc.cookie = 'fb=' + fbCookie + contentHash + '; path=/';
				}
			}
			setTimer( [ start, item ],
				itemSettings.autoStart && ( +itemSettings.autoDelay || 0 ) * 999
			);
		}
	}  // maybeStart


	function camelCase ( str, kebab ) {
		// Convert to and from camelCase and kebab-case (css-case).
		return (
			kebab ? patch( str, /[A-Z]/g, '-$&' ).toLowerCase()
			: patch( str,
				/-([a-z]?)/g,
				function ( _0, $1 ) {
					return $1.toUpperCase();
				}
			)
		);
	}  // camelCase


	function getHash( str ) {
		// Returns a simple hash value of a string.
		// Modified djb2 hash from //www.cse.yorku.ca/~oz/hash.html
		str = ''+str;
		var
			hash = 5381,
			i = str.length;

		while ( i-- ) {
			// hash = hash * 33 ^ str.charCodeAt( i );
			hash = ( ( hash << 5 ) + hash ) ^ str.charCodeAt( i );  // slightly faster
		}
		return hash;
	}  // getHash


	function getInt ( str, base ) {
		// parseInt wrapper.
		return parseInt( str, base || 10 ) || 0;
	}  // getInt


	function getFloat ( str ) {
		return parseFloat( str ) || 0;
	}  // getFloat


	function getStrings ( language ) {
		// Set the shared strings var, maybe after fetching a requested language file.

		strings = data.strings || [
			'en',
			'Close (key: Esc)',
			'Prev (key: \u2190)',
			'Next (key: \u2192)',
			'Play (key: spacebar)',
			'Pause (key: spacebar)',
			'Resize (key: Page Up/Down)',
			'Image %1 of %2',
			'Page %1 of %2',
			'(%1 of %2)',
			'Info...',
			'Print...',
			'Open in a new window',
			'Pop-up content is blocked by this browser.'
		];
		if ( language && language != strings[ 0 ] ) {
			require( fbPath + 'languages/' + language + '.js', getStrings );
		}
	}  // getStrings


	function getIcons () {
		// Populate the fb.icons object with svg code.

		function buildSVG ( elements, width ) {
			width = width || 1000;
			var
				html = '',
				i;

			for ( i = 0; i < elements.length; i++ ) {
				html += makeOuterHtml( elements[ i ][ 0 ], false, elements[ i ][ 1 ] );
			}

			return makeOuterHtml( 'svg', html, [
				'viewBox', '0 0 ' + width + ' 1000',
				'width', width / 1000 + 'em',
				'height', '1em'
			] );
		}

		icons = {

			close: buildSVG( [
				[ 'polygon', [ 'points', '0,230 170,60 850,740 680,910' ] ],
				[ 'polygon', [ 'points', '850,230 680,60 0,740 170,910' ] ]
			] ),

			close2: buildSVG( [
				[ 'circle', [ 'stroke-width', 100, 'fill', 'none', 'cx', 500, 'cy', 500, 'r', 450 ] ],
				[ 'polygon', [ 'points', '250,350 350,250 750,650 650,750' ] ],
				[ 'polygon', [ 'points', '750,350 650,250 250,650 350,750' ] ]
			] ),

			close3: buildSVG( [
				[ 'path', [ 'd', 'M125,275 Q50,200,125,125 T275,125 L875,725 Q950,800,875,875 T725,875 Z' ] ],
				[ 'path', [ 'd', 'M875,275 Q950,200,875,125 T725,125 L125,725 Q50,800,125,875 T275,875 Z' ] ]
			] ),

			prev: buildSVG( [
				[ 'path', [ 'd', 'M0,500 L600,100 V325 H1000 V675 H600 V900 Z' ] ]
			] ),

			next: buildSVG( [
				[ 'path', [ 'd', 'M1000,500 L400,100 V325 H0 V675 H400 V900 Z' ] ]
			] ),

			prev2: buildSVG( [
				[ 'path', [ 'd', 'M100,500 L494,938 C520,967,464,1023,438,994 L33,544 C4,510,4,490,33,456 L438,6 C464,-23,520,33,494,62 z' ] ]
			], 500 ),

			next2: buildSVG( [
				[ 'path', [ 'd', 'M400,500 L6,938 C-20,967,36,1023,62,994 L467,544 C496,510,496,490,467,456 L62,6 C36,-23,-20,33,6,62 z' ] ]
			], 500 ),

			prev3: buildSVG( [
				[ 'path', [ 'd', 'M0,500 l400,-400 q46,-46,92,0 t0,92 l-310,310 l310,310 q46,46,0,92 t-92,0 z M135,435 h800 q65,0,65,65 t-65,65 h-800 z' ] ]
			] ),

			next3: buildSVG( [
				[ 'path', [ 'd', 'M1000,500 l-400,-400 q-46,-46,-92,0 t0,92 l310,310 l-310,310 q-46,46,0,92 t92,0 z M865,435 h-800 q-65,0,-65,65 t65,65 h800 z' ] ]
			] ),

			play: buildSVG( [
				[ 'path', [ 'd', 'M625,500 L0,875 V125 Z' ] ]
			], 625 ),

			pause: buildSVG( [
				[ 'rect', [ 'x', 0, 'y', 125, 'width', 225, 'height', 750, 'rx', 75, 'ry', 75 ] ],
				[ 'rect', [ 'x', 400, 'y', 125, 'width', 225, 'height', 750, 'rx', 75, 'ry', 75 ] ]
			], 625 ),

			play2: buildSVG( [
				[ 'circle', [ 'stroke-width', 100, 'fill', 'none', 'cx', 500, 'cy', 500, 'r', 450 ] ],
				[ 'path', [ 'd', 'M375,720 V280 L755,500 z' ] ]
			] ),

			pause2: buildSVG( [
				[ 'circle', [ 'stroke-width', 100, 'fill', 'none', 'cx', 500, 'cy', 500, 'r', 450 ] ],
				[ 'path', [ 'd', 'M320,300 h125 v400 h-125 z M680,300 h-125 v400 h125 z' ] ]
			] ),

			zoom: buildSVG( [
				[ 'circle', [ 'stroke-width', 100, 'fill', 'none', 'cx', 380, 'cy', 380, 'r', 330 ] ],
				[ 'path', [ 'd', 'M210,335 h340 v90 h-340 z M820,690 l170,170 q30,165,-135,135 l-170,-170 L580,580 z' ] ],
				[ 'path', [ 'd', 'M335,210 v340 h90 v-340 z' ] ]
			] ),

			info: buildSVG( [
				[ 'circle', [ 'stroke-width', 100, 'fill', 'none', 'cx', 500, 'cy', 500, 'r', 450 ] ],
				[ 'circle', [ 'cx', 500, 'cy', 280, 'r', 70 ] ],
				[ 'path', [ 'd', 'M580,420 h-200 v70 h70 v200 h-70 v70 h270 v-70 h-70 z' ] ]
			] ),

			print: buildSVG( [
				[ 'path', [ 'd', 'M170,800 V1000 H830 V800 H1000 V410 H830 V230 L600,0 H170 V410 H0 V800 z M780,950 H220 V765 H780 z M570,50 V260 H780 V510 H220 V50 z M60,475 h65 v65 h-65 z' ] ]
			] ),

			newWindow: buildSVG( [
				[ 'path', [ 'stroke-width', 70, 'fill', 'none', 'd', 'M500,120 h-350 q-120,0,-120,120 v520 q0,120,120,120 h610 q120,0,120,-120 v-270' ] ],
				[ 'path', [ 'd', 'M970,0 q30,0,30,30 v280 c0,60,-60,30,-60,30 l-280,-280 c-30,-60,30,-60,30,-60 z M915,0 l85,85 l-530,530 l-85,-85 z' ] ]
			] ),

			dragger: buildSVG( [
				[ 'path', [ 'd', 'M160,1000 h-160 L1000,0 v160 z M500,1000 h-160 L1000,317 v160 z M826,1000 h-160 L1000,643 v160 z' ] ]
			] ),

			tooltiptop: buildSVG( [
				[ 'path', [ 'd', 'M0,0 h1000 l-500,800 z' ] ]
			] ),

			tooltipright: buildSVG( [
				[ 'path', [ 'd', 'M1000,0 v1000 l-800,-500 z' ] ]
			] ),

			tooltipbottom: buildSVG( [
				[ 'path', [ 'd', 'M1000,1000 h-1000 l500,-800 z' ] ]
			] ),

			tooltipleft: buildSVG( [
				[ 'path', [ 'd', 'M0,1000 v-1000 l800,500 z' ] ]
			] )
		};

	}  // getIcons

///  begin video functions

	function videoPrep ( item ) {
		// Configure iframe video service URLs.
		var
			rexFb = /(\.mp4)$/i,
			rexYouVim = /(youtube|vimeo)\.com\/(?:embed\/)?([\w-]+)/,
			itemSettings = item.itemSettings,
			pathParts = parseUrl( item.boxContent ),
			path = patch( pathParts.noQuery, 'youtu.be', 'youtube.com' ),
			qs = pathParts.query,
			autoplay = ifNotSet( itemSettings.autoPlayVideo, qs.autoplay != '0' ) ? 1 : 0,
			autoend = ifNotSet( itemSettings.autoEndVideo, qs.autoend != '0' ) ? 1 : 0,
			params = {  // to be added to all video querystrings
				autoplay: autoplay,
				bgcolor: itemSettings.contentBackgroundColor || 'transparent'
			},
			vidService,
			vidId,
			match;

		// fb's video player
		if ( ( match = rexFb.exec( path ) ) ) {

			//  vidService = 'fb';
			item.vidPoster = patch( path, match[ 1 ], '.jpg' );
			path = resourcesFolder + 'video.html';

			extend( params, {
				autoend: autoend,
				esc: itemSettings.enableKeyboardNav,
				source: item.boxContent,
				fb: fbPath
			} );
		}

		else if ( ( match = rexYouVim.exec( path ) ) ) {
			vidService = match[ 1 ];
			vidId = qs.v || match[ 2 ];  // qs.v from youtube.com/watch?v=id
			deleteProp( qs, 'v' );

		// youtube embed
			if ( vidService == 'youtube' ) {
				path = 'https://www.youtube.com/embed/' + vidId;
				extend( params, {
					fs: 1,  // fullscreen
					autohide: 1,  // hide the controls bar
					showinfo: 0,  // no title and youtube logo at the top
					rel: 0,  // don't show related
					enablejsapi: 1  // for auto-ending
				} );
				item.vidPoster = 'https://img.youtube.com/vi/' + vidId + '/maxresdefault.jpg';
			}

		// vimeo embed
			else {  // vimeo
				path = 'https://player.vimeo.com/video/' + vidId;
				extend( params, {
					badge: 0,
					byline: 0,
					portrait: 0,
					title: 0
				} );
			}
		}

		item.boxContent = parseUrl( path, extend( params, qs ) ).fullUrl;
		item.vidService = vidService;
		itemSettings.autoEndVideo = autoend;  // messageHandler needs to know

		// add video thumb (and play button) for youtube and vimeo
		if ( vidService == 'vimeo' && itemSettings.fetchVideoInfo !== false ) {
			// pull info from vimeo api first

			ajax( 'https://vimeo.com/api/v2/video/' + vidId + '.json', {
				finish: function ( xhr ) {
					var response = xhr.responseJSON;
					if ( response ) {
						response = response[ 0 ];  // vimeo returns an array
						itemSettings.caption = ifNotSet( itemSettings.caption, response.title );
						itemSettings.width = itemSettings.width || getInt( response.width );
						itemSettings.height = itemSettings.height || getInt( response.height );
						item.vidPoster = response.thumbnail_large;
					}
					videoAddThumb( item );
				}
			} );
		}
		else {
			videoAddThumb( item );
		}
	}  // videoPrep


	function videoAddThumb ( item ) {
		// Insert or update a video link thumbnail.
		var
			itemSettings = item.itemSettings,
			addVideoThumb = itemSettings.addVideoThumb,
			$host = item.hostEl,
			thumbSource = item.vidPoster;

		function addThumb ( $img ) {
			var
				$thumb,
				width,
				height;

			if ( $img.ok ) {

				$thumb = item.thumbEl;
				if ( !$thumb ) {
					$thumb = item.thumbEl = newElement( 'img' );
					placeElement( $thumb, $host, $host.firstChild );
				}

				width = $thumb.width || 0;  // user can style a blank.gif thumb placeholder
				width = mathMin( $img.width,
					width > 32 ? width  // ie's broken-image image is 28px wide
					: +addVideoThumb === addVideoThumb ? addVideoThumb  // numeric width request
					: addVideoThumb == 'small' ? 120
					: addVideoThumb == 'large' ? 480
					: 240  // default medium
				);
				height = $thumb.height = width * $img.height / $img.width;  // keep it proportional

				setStyle( $thumb, {
					width: width,
					height: height,
					maxWidth: width
			} );
				$thumb.src = thumbSource;

				item.playButton = ifNotSet( item.playButton,
					width < 180 ? 'small' :
					width > 360 ? 'large' :
					true
				);
				videoAddPlay( item );

				itemSettings.zoomSource = ifNotSet( itemSettings.zoomSource, thumbSource );
			}
		}

		// handle zoomSource='poster' here (after videoPrep has set vidPoster)
		if ( itemSettings.zoomSource == 'poster' ) {
			itemSettings.zoomSource = thumbSource || null;
		}

		if ( addVideoThumb !== false && $host && thumbSource ) {
			preload( thumbSource, addThumb );
		}
		else {
			videoAddPlay( item );
		}
	}  // videoAddThumb


	function videoAddPlay ( item ) {
		// Add video play button to an existing thumb.
		var
			size = item.playButton,
			$thumb = size && item.thumbEl,
			$wrapper,
			$playButton,
			thumbRect,
			buttonRect;

		function addPlay ( $img ) {
			if ( $img.ok ) {

				$wrapper = $thumb.parentElement;
				if ( !hasClass( $wrapper, 'fbVid' ) ) {
					// put a wrapper around the thumb img element

					$wrapper = wrapElement( $thumb, 'span' );
					addClass( $wrapper, 'fbVid' );
					setStyle( $wrapper, 'cssText', getStyle( $thumb ) );  // transfer borders etc.
					setStyle( $thumb, {
						position: 'relative',
						border: 0,
						margin: 0
					} );

					thumbRect = getRect( $thumb );  // after borders are gone
					setStyle( $wrapper, {
						display: 'inline-block',
						position: 'relative',
						overflow: 'hidden',
						width: thumbRect.width,
						height: thumbRect.height
					} );
				}

				$playButton = select( 'i', $wrapper, 0 ) || newElement( 'i', icons.play );
				addClass( $playButton, 'fbIcon' );
				setStyle( $playButton, {
					position: 'absolute',
					fontSize: size == 'small' ? 20 : size == 'large' ? 48 : 28
				} );
				placeElement( $playButton, $wrapper );

				thumbRect = getRect( $thumb );
				buttonRect = getRect( $playButton );
				setStyle( $playButton, {
					left: ( thumbRect.width - buttonRect.width ) / 2,
					top: ( thumbRect.height - buttonRect.height ) / 2
				} );
			}
		}

		if ( $thumb ) {
			preload( $thumb.src, addPlay );
		}
	}  // videoAddPlay

///  end video functions

///  begin contip functions

	function contipActivate ( $hosts, ownerBox ) {
		// Light up fbContext and fbTooltip elements.
		var
			tooltipSettings = {
				autoFitSpace: 2,
				minWidth: 0,
				minHeight: 0,
				enableDragMove: false,
				enableDragResize: false,
				innerBorder: 0,
				outerBorder: 1,
				outsideClickCloses: true,
				padding: 0,
				contentScroll: false,
				showClose: false,
				showOuterClose: false,
				titleAsCaption: false,
				outerBorderRadius: 4,
				fadeTime: 0.2,
				shadowSize: 4,
				shadowType: 'drop'
			},
			contextSettings = extend( {}, tooltipSettings, {
				boxLeft: 'click',
				boxTop: 'click',
				outerBorderRadius: 0,
				fadeTime: 0,
				shadowSize: 8,
				shadowType: 'hybrid'
			} ),
			$host,
			isContext,
			itemSettings,
			item,
			i;

		for ( i = 0; i < $hosts.length; i++ ) {
			$host = $hosts[ i ];
			isContext = hasClass( $host, contextClass );
			itemSettings = parseOptions( attr( $host, 'data-fb-' + ( isContext ? 'context' : 'tooltip' ) ) );

			if ( itemSettings.source && !items[ $host.tip ] ) {  // not already activated
				addClass( itemSettings, getClass( $host ) );  // import user-defined class settings
				itemSettings.contipSettings = isContext ? contextSettings : tooltipSettings;
				// activate as a standard floatbox item
				item = activateItem( undefined, ownerBox, itemSettings );

				if ( item ) {
					item.hostEl = $host;
					item.isContip = true;
					item.isTooltip = !isContext;
					$host.tip = items.length - 1;  // event handler can find the items record
					itemSettings = item.itemSettings;
					itemSettings.modal = itemSettings.sameBox = false;  // these can't be overridden
					itemSettings.resizeTime = 0;
					itemSettings.group = null;

					addEvent( $host,
						isContext ? [
							'touchend',
							itemSettings.contextMouseButton != 'right' && 'click',
							itemSettings.contextMouseButton != 'left' && 'contextmenu'
							// contextmenu may be unreliable
						]
						: [  // isTooltip
							'mouseover',
							'mouseout',
							!getTagName( $host, [ 'a', 'area' ] ) && 'touchend'
							// don't disrupt link touches
						],
						contipHandler
					);
				}
			}
		}
	}  // contipActivate


	function contipHandler ( e ) {
		// event handler for context and tooltip host nodes.
		var
			type = e.type,
			related = e.relatedTarget,  // may be null if from and to els are on different docs
			$this = this,
			instance = $this.fbName == 'fbMain' && getOwnerInstance( $this ),
			item = instance && instance.activeItem || items[ $this.tip ],
			i;

		if ( item
			&& ( !usingTouch || tapInfo.type && !/mouse/.test( type ) )
			// ignore multi-touches and follow-on events after a touch
		) {
			// fbContext
			// (outsideClickCloses and keydownHandler do the work of closing context boxes)
			if ( hasClass( item.itemSettings, contextClass ) ) {
				if ( tapInfo.type ) {
					stopEvent( e );
					start( item );
				}
			}

			// fbTooltip
			else {

				// find showing instance
				i = instances.length;
				while ( !instance && i-- ) {
					instance = instances[ i ] || {};
					if ( instance.activeItem != item ) {
						instance = undefined;
					}
				}

				if ( type == 'mouseout' ) {
					if ( !(
						nodeContains( item.hostEl, related )
						|| ( instance && nodeContains( instance.fbMain, related ))
						// ignore mouseouts when the related mouseover target is our host or box
					) ) {
						clearTimer( TIMER_tooltip );
						if ( instance ) {
							instance.state = STATE_start;  // allows end to proceed early
							setTimer( instance.end );  // need timer in case box is just starting up
						}
					}
				}

				// mouseover and touchend start a tooltip
				else if ( !instance && !timeouts[ TIMER_tooltip ] ) {  // not already started
					( usingTouch ? trigger : setTimer )(  // go, maybe, after a while
						[ maybeStart, item ],
						ifNotSet( item.itemSettings.delay, 333 ),
						TIMER_tooltip
					);
				}
			}
		}
	}  // contipHandler

///  end contip functions

///  begin cycler functions

// cyclers: [ {
//   hostDiv: <div>,
//   members: [ {
//      memberEl: <a/div>,
//      imgSrc: <img>.src,
//      imgEl: <img>,
//      captionSpan: <span>
//   }, ... ],
//   showing: members index,
//   paused: boolean,
//   controlSpan: <span>,
//   aniWrapper: <i>,
//   progress: {} for animate monitor data,
//   cycFadeTime:  seconds
//   cycZoom: fraction,
//   cycEasing: >= 1,
//   cycInflection: easing inflection point,
//   cycControlsPos: pos string
// }, ... ]

	function cyclerActivate ( $hosts ) {
		// Light up the cycler divs on this page.
		var
			$host,
			tagName,
			caption,
			$img,
			imgSrc,
			$captionSpan,
			$aniWrapper,
			$child,
			idx,
			i, j;

		for ( i = 0; i < $hosts.length; i++ ) {
			$host = $hosts[ i ];
			if ( $host && !cyclers[ $host.fbx ] ) {  // not already activated
				var
					members = [],
					divSettings = extend( {}, baseSettings, parseOptions( $host ) ),
					children = [].slice.call( $host.children );

				// gather node:img pairs that live inside this cycler div
				for ( j = 0; j < children.length; j++ ) {
					$child = children[ j ];

					if ( ( tagName = getTagName( $child, [ 'img', 'div', 'a' ] ) ) ) {

						if ( tagName == 'img' ) {
							// wrap bare images in divs (for css display and absolute positioning)
							$img = $child;
							$child = wrapElement( $img, 'div' );  // pass node type to prevent styling
						}
						else {
							$img = select( 'img', $child, 0 );  // the first image in the node
						}

						imgSrc = attr( $img, 'data-fb-src' )  // first choice
							|| /\.(jpe?g|png|gif|webp)\b/i.test(
								attr( $img, 'longdesc' )  // image path or a true longdesc?
							) && imgSrc
							|| attr( $img, 'src' );  // no alternate being used

						if ( imgSrc ) {  // has something to cycle

							// sort out caption
							$captionSpan = select( 'span', $child, 0 );
							if ( !$captionSpan ) {
								caption = divSettings.titleAsCaption !== false && attr( $img, 'title' )
									|| divSettings.altAsCaption && attr( $img, 'alt' )
									|| '';
								if ( caption ) {
									$captionSpan = newElement( 'span', caption );
									placeElement( $captionSpan, $child );
								}
							}

							// save node, image, caption and per-item interval in the members array
							members.push( {
								memberEl: $child,
								imgSrc: imgSrc,
								imgEl: $img,
								captionSpan: $captionSpan
							} );
						}
					}
				}

				// if more than one node/img pair, setup cycler and save it to the items array
				if ( members.length > 1 ) {
					var
						cycZoom = ifNotSet( divSettings.cycleZoom, 0.2 ),
						enableClick = divSettings.cyclePauseOnClick,
						cycControlsPos = enableClick
							&& divSettings.cycleShowControls !== false
							&& ( divSettings.cycleControlsPos || 'bl' );

					// interval applies to all cyclers on the page
					cycleInterval = divSettings.cycleInterval || cycleInterval;

					// add a wrapper with two img or canvas elements for doing the animation work
					// use <i> to avoid .fbCycler span caption styling
					$aniWrapper = placeElement( newElement( 'i' ), $host );
					tagName = cycZoom ? 'canvas' : 'img';
					setStyle( [  // two new elements
							placeElement( newElement( tagName ), $aniWrapper ),
							placeElement( newElement( tagName ), $aniWrapper ),
							$aniWrapper
						],
						{
							position: 'absolute',
							left: 0,
							top: 0,
							padding: 0,
							borderWidth: 0,
							margin: 0,
							width: '100%'
						}
					);

					// add visible play/pause control on top of the div
					$child = cycControlsPos && placeElement( newElement( 'i' ), $host );
					addClass( $child, 'fbCyclerControl' );  // might be empty

					$host.fbx = idx = cyclers.length;
					cyclers.push( {
						hostDiv: $host,
						members: members,  // all the usable nodes (and their thumbs) in this div
						showing: members.length - 1,  // initialized to last img for show setup below
						paused: enableClick && divSettings.cycleStartPaused,  // initial pause state
						controlSpan: $child,
						aniWrapper: $aniWrapper,
						progress: { step: 1 },  // flag as complete so the first animation can proceed
						cycFadeTime: ifNotSet( divSettings.cycleFadeTime, 1.7 ),
						cycZoom: cycZoom,
						cycEasing: divSettings.cycleEasing || 1.4,
						cycInflection: divSettings.cycleInflection,
						cycControlsPos: cycControlsPos
					} );

					// use cyclerShow to initialize the animator span
					cyclerShow( idx, 0, true );

					// add click/touch/hover handlers to toggle paused state
					addEvent( $host,
						enableClick ? [ 'touchend', 'click' ]
						: divSettings.cyclePauseOnHover ? [ 'mouseover', 'mouseout' ]
						: undefined,
						cyclerHandler
					);
				}
			}
		}

		if ( cyclers.length && !timeouts[ TIMER_show] ) {
			setTimer( cyclerShowNext, cycleInterval * 377, TIMER_show );  // start 'em up
		}
	}  // cyclerActivate


	function cyclerHandler ( e ) {
		// Pause/resume on mouse/touch events.
		var cycler = cyclers[ this.fbx ];

		if ( cycler
			&& ( !usingTouch || e.type == 'touchend' )
			&& !nodeContains( cycler.hostDiv, e.relatedTarget )
		) {
			cyclerPause( cycler,
				e.type == 'mouseover' ? true
				: e.type == 'mouseout' ? false
				: !cycler.paused  // click or touch toggles pause
			);
		}
	}  // cyclerHandler


	function cyclerPause ( cycler, stop ) {
		// Pause/unpause and set innerHTML of the cycler control to match the pause state.
		var
			$control,
			cycControlsPos,
			controlRect,
			img,
			imgRect,
			imgBorder,
			dx;

		if ( stop !== undefined ) {  // no stop or start request? just paint the control below
			cycler.paused = stop;
			cycler.progress.active = !stop;  // resume or suspend in-progress animations
		}

		if ( ( $control = cycler.controlSpan ) ) {

			$control.innerHTML = patch( strings[ cycler.paused ? STR_play : STR_pause ],
				// unbracketed text + two spaces + icon
				/\(.+\)/,
				'&nbsp;' + makeOuterHtml(
					'i',
					icons[ cycler.paused ? 'play2' : 'pause2' ],
					[ 'class', 'fbIcon' ]
				)
			);
			setStyle( $control, 'display', 'inline-block' );  // before getting offsetWidth/Height

			cycControlsPos = cycler.cycControlsPos;
			img = cycler.members[ cycler.showing ].imgEl;
			imgRect = getRect( img );
			imgBorder = getStyle( img, 'border' );
			controlRect = getRect( $control );
			dx = imgRect.width - controlRect.width;

			setStyle( $control, {
				left: /r/.test( cycControlsPos )
					? dx - imgBorder.right - 12
					: /c/.test( cycControlsPos )
					? dx / 2
					: imgBorder.left + 12,
				top: /b/.test( cycControlsPos )
					? imgRect.height - controlRect.height - imgBorder.bottom - 12
					: imgBorder.top + 12
			} );
		}
	}  // cyclerPause


	function cyclerShowNext () {
		// Show next member of each unpaused cycler div
		// unless it's under a modal box.
		var
			limit = -1,
			cycler,
			$host,
			instance,
			i;

		instance = getInstance( undefined, true );  // top-most modal box
		if ( instance ) {
			limit = instance.stackOrder;
		}

		i = cyclers.length;
		while ( i-- ) {
			if ( ( cycler = cyclers[ i ] ) ) {

				if ( ( $host = cycler.hostDiv ) ) {  // the cycler div might have gone away

					// cycle unpaused, visible, idle cyclers
					if ( !( cycler.paused || document.hidden )
						&& !( cycler.progress.active && cycler.progress.step < 1 )
					) {
						// check ownerInstance each time because cycler div might be in box content
						instance = getOwnerInstance( $host );
						if ( limit <= ( instance && instance.stackOrder || -1 ) ) {
							// cycle a cycler only if it's in or above the top-most modal box
							cyclerShow( i, cycler.showing + 1 );
						}
					}
				}
			}
		}

		if ( !timeouts[ TIMER_show] ) {
			setTimer( cyclerShowNext, cycleInterval * 999, TIMER_show );
		}
	}  // cyclerShowNext


	function cyclerShow ( iDiv, iNode, setup ) {
		// Display (unhide) the iNode'th node in the iDiv'th div,
		// fading unless asked not to.
		var
			cycler = cyclers[ iDiv ],
			$aniWrapper = cycler.aniWrapper,
			$ani = $aniWrapper.firstChild,  // the first of the two animation img or canvas worker bees
			members = cycler.members,
			nodeToShow = iNode % members.length,  // handle wrapping so the caller doesn't have to
			currentMember = members[ cycler.showing ],
			nextMember = members[ nodeToShow ],
			$nextEl = nextMember.memberEl,  // the new node to be faded in
			$nextImg = nextMember.imgEl,
			cycZoom = cycler.cycZoom,
			cycInflection = cycler.cycInflection,
			width,
			height,
			aniStart,
			aniEnd,
			swap;

		if ( setup || $nextImg
			&& ( preloads[ nextMember.imgSrc ] || {} ).ok  // img has finished loading
		) {

			if ( !setup || !timeouts[ TIMER_show] ) {
				setStyle( nextMember.captionSpan, 'opacity', 0 );
				setStyle( $nextImg, 'visibility', 'hidden' );
			}
			setStyle( $nextEl, {
				position: 'absolute',
				visibility: 'visible'
			} );
			setStyle( cycler.hostDiv, 'height', getRect( $nextEl ).height );

			// width and height have to be picked up after above style changes
			// otherwise webkit does weird stuff with max-width:100% on the wrapper div
			width = $nextImg.width;  // use the actual img node to pick up non-native sizing
			height = $nextImg.height;

			// default animation start
			aniStart = { left: 0, top: 0, width: width, height: height };
			// place animator into the incoming img's parent so it can pick up anchor clicks
			// and copy that img's css so layout won't change
			setStyle( $aniWrapper, 'cssText', getStyle( $nextImg ) );  // copy all
			setStyle( $aniWrapper, extend( {  // overrides
					zIndex: getStyle( $nextImg, 'zIndex', true ) + 1,
					display: 'inline-block',
					position: 'absolute',
					visibility: 'visible'
				},
				aniStart
			) );
			placeElement( $aniWrapper, $nextImg.parentElement );

			// initial state for animation
			setBorderRadius( $ani );  // pull in roundies from aniWrapper which pulled them in from the img
			setStyle( $ani, 'opacity', 0 );
			$ani.src = $nextImg.src;  // for img elements
			$ani.width = width;  // canvas size has to be set in pixels
			$ani.height = height;
			placeElement( $ani, $aniWrapper );  // move over top of previous ani[ 0 ]

			// start the opacity fades
			animate( [
					{ $: [ $ani, nextMember.captionSpan ],
						opacity: 1
					},
					{ $: currentMember.captionSpan,
						opacity: 0
					}
				],
				[ setStyle, currentMember.imgEl, 'visibility', 'hidden' ],
				setup ? 0 : cycler.cycFadeTime * 990
			);

			// do the zoom/pan thing
			if ( cycZoom ) {

				aniEnd = {
					left: -randomInt( width * cycZoom ),
					top: -randomInt( height * cycZoom ),
					width: width * ( 1 + cycZoom ),
					height: height * ( 1 + cycZoom )
				};

				// randomly swap zooming in or out
				if ( setup || randomInt( 1 ) ) {
					cycZoom *= -aniStart.width / aniEnd.width;
					swap = aniStart;
					aniStart = aniEnd;
					aniEnd = swap;
				}

				// randomize easing inflection point if not specified
				if ( +cycInflection !== cycInflection ) {
					cycInflection = randomInt( 80 ) / 100 + 0.1;  // between .1 and .9
				}

				// rig up the canvas context so it can be used like an img in animate
				aniEnd.$ = $ani = $ani.getContext( '2d' );
				$ani.img = $nextImg;  // tells animate what img to draw
				$ani.style = aniStart;  // fake style property for initial values

				// start zooming
				animate( aniEnd, undefined,
					setup ? 0 : cycleInterval * 990,
					cycInflection,
					setup ? 1 : cycler.cycEasing,
					cycler.progress
				);
			}
		}

		cycler.showing = nodeToShow;

		// display the control at the first cycle
		if ( !setup ) {
			cyclerPause( cycler );
		}

		// prep the next one for showing
		nextMember = members[ ( nodeToShow + 1 ) % members.length ];
		preload( ( nextMember.imgEl.src = nextMember.imgSrc ) );
	}  // cyclerShow

///  end cycler functions

///  begin popup functions

	function popupActivate ( $hosts, ownerBox ) {
		// Adds mouse over/out actions to popup thumbnails (including index links).
		var
			$host,
			$thumb,
			match,
			i;

		i = $hosts.length;
		for ( i = 0; i < $hosts.length; i++ ) {
			$host = $hosts[ i ];
			if ( !popups[ $host.pop ] ) {  // don't reactivate

				$thumb = select( 'img', $host, 0 );
				match = getClass( $host ).join( ' ' );
				if ( ( match = $thumb && /\bfbPop(\w+)\b/i.exec( match ) ) ) {

					$host.pop = popups.length;  // popups index on the host's expando
					popups.push( {
						hostEl: $host,
						thumbEl: select( 'img', $host, 0 ),
						popupType: match[ 1 ].toLowerCase(),
						ownerBox: ownerBox  // for destroy's cleanup
					} );

					// add event handlers
					addEvent( $host,
						[ 'touchend', 'mouseover', 'mouseout' ],
						popupHandler
					);
				}
			}
		}
	}  // popupActivate


	function popupHandler ( e ) {
		// Event handler assigned to popup thumb host elements.
		var
			type = e.type,
			$this = this,
			item = popups[ $this.pop ],
			$thumb = item && item.thumbEl,
			hidden;

		if ( $thumb ) {
			hidden = getRect( $thumb ).bottom + viewport.top < 0;

			if ( usingTouch ) {
				if ( type == 'touchend' && hidden ) {
					popupShow( $this );
					tapHandler();  // prevent starting floatbox link
					stopEvent( e );  // prevent following nofloatbox link
				}
			}

			// using mouse
			else if ( type == 'mouseover' ) {
				if ( hidden ) {
					popupShow( $this );
				}
			}
			else if ( !hidden ) {  // mouseout
				popupHide( $this );
			}
		}
	}  // popupHandler


	function popupShow ( $host ) {
		// Pop up a popup.
		var
			item = $host && popups[ $host.pop ],
			$thumb = item && item.thumbEl,
			hostBorder;

		if ( $thumb ) {

			setStyle( $host, 'display', 'inline-block' );  // anchor height will encompass thumbs
			popupHideAll();  // can show only one popup thumb at a time

			var
				popupType = item.popupType,
				hostRect = getRect(
					popupType == 'center' && select( 'img', $host, 1 ) || $host
				),
				thumbRect = getRect( $thumb ),
				thumbWidth = thumbRect.width,
				thumbHeight = thumbRect.height,
				context = getOwnerInstance( $thumb ),
				left = hostRect.x,  // = x temporarily
				top = hostRect.y;

			if ( left > 0 && left < viewport.width && top > 0 && top < viewport.height ) {

				left = hostRect.left + (
					popupType == 'left' ? -thumbWidth
					: popupType == 'right' ? hostRect.width - 1
					: ( hostRect.width - thumbWidth ) / 2  // center
				);
				top = hostRect.top + (
					popupType == 'up' ? 2 - thumbHeight
					: popupType == 'down' ? hostRect.height - 1
					: ( hostRect.height - thumbHeight ) / 2  // center
				);

				// if popup is offscreen, move it in
				context = context
					? getRect( context.fbLiner )  // use fbLiner as the screen for stuff within it
					: { left: 0, top: 0, width: viewport.width, height: viewport.height };
				left = mathMin( left, context.left + context.width - thumbWidth );  // move in from right
				left = mathMax( left, context.left );  // move in from left
				top = mathMin( top, context.top + context.height - thumbHeight );  // move up from bottom
				top = mathMax( top, context.top );  // move down from top

				// position relative to offsetParent

				hostRect = getRect( $thumb.offsetParent );
				hostBorder = getStyle( $thumb.offsetParent, 'border' );
				setStyle( $thumb, {
					left: left - hostRect.left - hostBorder.left,
					top: top - hostRect.top - hostBorder.top
				} );
			}
		}
	}  // popupShow


	function popupHide ( $host ) {
		// Hide one popup thumb.
		var item = !popups.locked && $host && popups[ $host.pop ];

		if ( item ) {
			setStyle( item.thumbEl, { left: 0, top: -bigNumber } );
		}
	}  // popupHide


	function popupHideAll ( $except ) {
		// Hide all popups, optionally except one.
		var
			item,
			$host,
			i;

		i = popups.length;
		while ( i-- ) {
			if ( ( item = popups[ i ] ) ) {
				$host = item.hostEl;
				if ( nodeContains( document, $host ) && !nodeContains( $host, $except ) ) {
					popupHide( $host );
				}
			}
		}
	}  // popupHideAll

///  end popup functions

///  end internal functions


	data.coreInit = function () {
		// floatbox.js will call coreInit after DOM is ready and document is activated.
		var
			parentData,
			parentSettings;

		if ( !data.fbParent.fb
			|| data.fbParent.fb.version != fb.version
			|| settings.baseSettings.framed
		) {
			data.fbParent = {};
		}

		parent = data.fbParent;
		parentData = parent.fb && parent.fb.data;
		parentSettings = parentData && parentData.settings || {};

		topView = self;
		while ( topView.fb.data.fbParent.fb ) {
			topView = topView.fb.data.fbParent;
		}

		// parent-first initialization
		if ( parentData && !parentData.fbIsReady ) {
			setTimer( data.coreInit, 77 );
		}
		else {

			// top window references and data to support boxes attaching there
			topDoc = topView.document;
			topData = topView.fb.data;
			topUrl = topData.locationUrl;
			instances = topData.instances;
			items = topData.items;
			popups = topData.popups;
			preloads = topData.preloads;
			wrappers = topData.wrappers;
			offHints = topData.offHints;

			// set some common vars that depend on floatbox.js:init having run
			baseSettings = settings.baseSettings = extend( {}, parentSettings.baseSettings, settings.baseSettings );
			classSettings = settings.classSettings = extend( {}, parentSettings.classSettings, settings.classSettings );
			typeSettings = settings.typeSettings = extend( {}, parentSettings.typeSettings, settings.typeSettings );
			resourcesFolder = fbPath + 'resources/';
			waitGif = resourcesFolder + 'wait.gif';
			zoomInCursor = 'url(' + resourcesFolder + 'zoom-in.cur),default';
			zoomOutCursor = patch( zoomInCursor, 'zoom-in', 'zoom-out' );  // IE doesn't do native zoom cursors
			contextClass = baseSettings.contextClass || 'fbContext';
			tooltipClass = baseSettings.tooltipClass || 'fbTooltip';
			cyclerClass = baseSettings.cyclerClass || 'fbCycler';
			preloadLimit = getInt( ifNotSet( baseSettings.preloadLimit, 5 ) );

			// set strings from language localization file or default English
			getStrings( patch(
				( baseSettings.language
					|| attr( topDoc.documentElement, 'lang' )
					|| 'en'
				).toLowerCase(),
				/^(\w+).*/i, '$1'
			) );

			// populate the svg icons array
			getIcons();

			// expose some more api functions defined here in core
			extend( fb, {
				activate: activate,
				getFormValues: getFormValues,
				getRect: getRect,
				getViewport: getViewport,
				getStyle: getStyle,
				setStyle: setStyle,
				getInstance: getInstance,
				getOwnerInstance: getOwnerInstance,
				nodeContains: nodeContains,
				printNode: printNode,
				parseJSON: parseJSON,
				getLayout: getLayout,  // legacy
				getByClass: getByClass,  // legacy
				getScroll: getViewport,  // legacy
				// objects
				icons: icons,
				viewport: viewport,
				// deferred from floatbox.js
				start: start,
				ajax: ajax,
				animate: animate,
				preload: preload,
				// per-box functions hooked up to fb.api calls
				showItem: runFromTopBox( 'showItem' ),
				resize: runFromTopBox( 'resize' ),
				pause: runFromTopBox( 'pause' ),
				reload: runFromTopBox( 'reload' ),
				goBack: runFromTopBox( 'goBack' ),
				end: runFromTopBox( 'end' )
			} );

			// extend data in a minifiable manner
			data.activateItem = activateItem;  // replaces the defered function
			data.tapHandler = tapHandler;  // for propagating tap info through frame boundaries
			data.clientOrigin = clientOrigin;  // so getRect from another frame can adjust

			// tapHandler monitors user input and rationalizes touch event sequences
			// also handles outsideClickCloses
			addEvent( document, [
					'touchstart',
					'mousedown',
					'keydown',
					'touchend',
					'mouseup'
				],
				tapHandler, true  // must catch things early in the capturing phase
			);

			// track viewport scroll and size changes and process keepCentered
			addEvent( self, [ 'resize', 'scroll' ], viewportHandler );
			viewportHandler();  // initialize viewport metrics

			// messageHandler for x-domain iframe communication
			addEvent( self, 'message', messageHandler );

			data.fbIsReady = true;
			fb.ready( [ activate, false ] );  // release the deferred queue and activate
			preload( waitGif );
			maybeStart( showAtLoad );
		}
	};  // coreInit

} )();
