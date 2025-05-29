// src/utils/animations.ts
import { gsap } from "gsap";

// Import all the plugins you have access to and intend to use
import { CustomEase } from "gsap/CustomEase";
import { CustomBounce } from "gsap/CustomBounce"; // Requires CustomEase
import { CustomWiggle } from "gsap/CustomWiggle"; // Requires CustomEase
import { RoughEase, ExpoScaleEase, SlowMo } from "gsap/EasePack";

import { Draggable } from "gsap/Draggable";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { EaselPlugin } from "gsap/EaselPlugin";
import { Flip } from "gsap/Flip";
import { GSDevTools } from "gsap/GSDevTools";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import { MotionPathHelper } from "gsap/MotionPathHelper";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { Observer } from "gsap/Observer";
import { Physics2DPlugin } from "gsap/Physics2DPlugin";
import { PhysicsPropsPlugin } from "gsap/PhysicsPropsPlugin";
import { PixiPlugin } from "gsap/PixiPlugin";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { SplitText } from "gsap/SplitText";
import { TextPlugin } from "gsap/TextPlugin";

// REGISTER ALL PLUGINS
// It's crucial to register them, so GSAP knows they exist
gsap.registerPlugin(
    CustomEase, CustomBounce, CustomWiggle,
    RoughEase, ExpoScaleEase, SlowMo,
    Draggable,
    DrawSVGPlugin,
    EaselPlugin,
    Flip,
    GSDevTools,
    InertiaPlugin,
    MotionPathHelper, MotionPathPlugin,
    MorphSVGPlugin,
    Observer,
    Physics2DPlugin, PhysicsPropsPlugin,
    PixiPlugin,
    ScrambleTextPlugin,
    ScrollTrigger,
    ScrollToPlugin,
    SplitText,
    TextPlugin
);

// --- Animation Definitions will go below ---

/**
 * Fades an element in.
 * @param target - The element(s) to animate.
 * @param duration - Animation duration in seconds.
 * @param delay - Delay before animation starts in seconds.
 */
export const fadeIn = (target: gsap.TweenTarget, duration: number = 0.4, delay: number = 0) => {
    return gsap.fromTo(target, { opacity: 0 }, { opacity: 1, duration, delay, ease: 'power2.out' });
};

/**
 * Fades an element out.
 * @param target - The element(s) to animate.
 * @param duration - Animation duration in seconds.
 * @param onComplete - Optional callback when animation completes.
 */
export const fadeOut = (target: gsap.TweenTarget, duration: number = 0.3, onComplete?: () => void) => {
    return gsap.to(target, { opacity: 0, duration, ease: 'power2.in', onComplete });
};

/**
 * Slides and fades an element in from a vertical offset.
 * @param target - The element(s) to animate.
 * @param yOffset - Vertical offset to start from.
 * @param duration - Animation duration.
 * @param stagger - Stagger amount for multiple targets.
 */
export const slideFadeIn = (target: gsap.TweenTarget, yOffset: number = 20, duration: number = 0.4, stagger: number = 0.05) => {
    return gsap.from(target, {
        opacity: 0,
        y: yOffset,
        duration,
        ease: 'power2.out',
        stagger
    });
};

/**
 * Animates a list item appearing.
 * @param itemRef - Ref to the list item element.
 */
export const animateListItemIn = (itemRef: HTMLElement) => {
    // Ensure it's visible before animating if it was display: none
    gsap.set(itemRef, { opacity: 0, height: 'auto' }); // Set initial state for 'from'
    const autoHeight = gsap.getProperty(itemRef, "height"); // Get auto height

    return gsap.from(itemRef, {
        opacity: 0,
        height: 0,
        y: 15, // Slightly slide up
        duration: 0.35,
        ease: 'power2.out',
        clearProps: "height,opacity,y" // Clean up inline styles after animation
    });
};

/**
 * Animates a list item disappearing before removal.
 * @param itemRef - Ref to the list item element.
 * @param onComplete - Callback after animation.
 */
export const animateListItemOut = (itemRef: HTMLElement, onComplete: () => void) => {
    return gsap.to(itemRef, {
        opacity: 0,
        height: 0,
        y: 15,
        marginTop: 0, // Collapse margins
        marginBottom: 0,
        paddingTop: 0,
        paddingBottom: 0,
        duration: 0.3,
        ease: 'power2.in',
        onComplete,
    });
};

// Add more animation functions as we identify needs