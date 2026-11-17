"""Clips for /learnings/perceptron."""

from manimlib import *

from style import FADED, INK, RULE, SAGE, Clip, formula, split_formula, words


# Comparisons set apart in pieces of their own keep TeX's spacing this way
GE = R"\mskip\thickmuskip\ge\mskip\thickmuskip"
LE = R"\mskip\thickmuskip\le\mskip\thickmuskip"


class MistakeBound(Clip):
    """Why the perceptron's mistakes run out: each one pushes w at least γ
    further along a splitting arrow w*, but grows |w|² by at most R², so
    after k mistakes kγ ≤ w · w* ≤ |w| ≤ √k R, and k ≤ (R/γ)²."""

    def construct(self):
        colours = {"w^{*}": SAGE, R"\gamma": SAGE}

        # What we assume, and the rule
        given, _ = split_formula(
            R"y\,(w^{*}\cdot x)", GE, R"\gamma", R",\qquad |x|", LE, "R",
            font_size=52,
            t2c=colours,
        )
        given_says = words(R"some unit arrow $w^{*}$ splits every point by $\gamma$", font_size=34, color=FADED)
        rule = formula(R"w \leftarrow w + y\,x", font_size=52)
        rule_says = words("on each mistake", font_size=34, color=FADED)

        given.move_to(UP * 1.2)
        given_says.next_to(given, DOWN, buff=0.35)
        self.play(Write(given), run_time=1.5)
        self.play(FadeIn(given_says, shift=0.2 * UP))
        self.wait(0.5)
        rule.next_to(given_says, DOWN, buff=0.8)
        rule_says.next_to(rule, DOWN, buff=0.3)
        self.play(Write(rule), FadeIn(rule_says), run_time=1)
        self.wait(0.5)

        # Keep both at the top, side by side
        header = VGroup(given.copy(), rule.copy()).arrange(RIGHT, buff=1.4).to_edge(UP, buff=0.5)
        self.play(
            FadeOut(given_says),
            FadeOut(rule_says),
            Transform(given, header[0]),
            Transform(rule, header[1]),
            run_time=1,
        )
        rule_line = Line(LEFT * 6.5, RIGHT * 6.5, stroke_color=RULE, stroke_width=2).next_to(header, DOWN, buff=0.35)
        self.play(ShowCreation(rule_line), run_time=0.4)

        # Along w*: every mistake adds at least γ
        along, ap = split_formula(
            R"(w + y\,x)\cdot w^{*}", "=", R"w\cdot w^{*}", "+", R"y\,(x\cdot w^{*})",
            font_size=52,
            t2c={"w^{*}": SAGE},
        )
        along.move_to(UP * 0.6)
        self.play(Write(along), run_time=1.3)
        brace = Brace(ap[4], DOWN, buff=0.15).set_fill(SAGE)
        at_least = formula(R"\ge \gamma", font_size=48, color=SAGE).next_to(brace, DOWN, buff=0.15)
        self.play(GrowFromCenter(brace), FadeIn(at_least, shift=0.2 * DOWN))
        self.wait(0.5)
        shadow = formula(R"w\cdot w^{*} \ge k\gamma", font_size=52, t2c=colours)
        shadow.move_to(DOWN * 2.6 + LEFT * 3.4)
        self.play(TransformFromCopy(VGroup(ap[2], at_least), shadow), run_time=1)
        self.play(FadeOut(VGroup(along, brace, at_least)), run_time=0.6)

        # Its length: every mistake adds at most R²
        length, lp = split_formula(
            R"|w + y\,x|^{2}", "=", R"|w|^{2}", "+", R"2y\,(w\cdot x)", "+", R"|x|^{2}",
            font_size=52,
        )
        length.move_to(UP * 0.6)
        self.play(Write(length), run_time=1.3)
        cross = Brace(lp[4], DOWN, buff=0.15).set_fill(INK)
        cross_says = words(R"$\le 0$: a mistake", font_size=34).next_to(cross, DOWN, buff=0.15)
        far = Brace(lp[6], DOWN, buff=0.15).set_fill(INK)
        far_says = formula(R"\le R^{2}", font_size=48).next_to(far, DOWN, buff=0.15)
        self.play(GrowFromCenter(cross), FadeIn(cross_says, shift=0.2 * DOWN))
        self.play(GrowFromCenter(far), FadeIn(far_says, shift=0.2 * DOWN))
        self.wait(0.5)
        size = formula(R"|w|^{2} \le k R^{2}", font_size=52)
        size.move_to(DOWN * 2.6 + RIGHT * 3.4)
        self.play(TransformFromCopy(VGroup(lp[2], far_says), size), run_time=1)
        self.play(FadeOut(VGroup(length, cross, cross_says, far, far_says)), run_time=0.6)

        # Together: a shadow is never longer than its arrow
        chain, cp = split_formula(
            R"k\gamma", LE, R"w\cdot w^{*}", LE, R"|w|", LE, R"\sqrt{k}\,R",
            font_size=60,
            t2c=colours,
        )
        chain.move_to(UP * 0.6)
        self.play(Indicate(shadow, color=SAGE, scale_factor=1.1), FadeIn(cp[0:3], shift=0.2 * UP), run_time=1)
        self.play(Indicate(size, color=INK, scale_factor=1.1), FadeIn(cp[4:7], shift=0.2 * UP), run_time=1)
        self.play(FadeIn(cp[3], scale=1.4), run_time=0.6)
        says = words(R"a shadow is never longer than the arrow", font_size=34, color=FADED)
        says.next_to(cp[2:5], DOWN, buff=0.35)
        self.play(FadeIn(says, shift=0.2 * DOWN))
        self.wait(0.5)

        result = formula(R"k \le \left(\frac{R}{\gamma}\right)^{2}", font_size=64, t2c={R"\gamma": SAGE})
        result.move_to(DOWN * 1.15)
        self.play(FadeOut(says), VGroup(shadow, size).animate.shift(DOWN * 0.45), run_time=0.5)
        self.play(FadeIn(result, shift=0.3 * DOWN), run_time=1)
        box = SurroundingRectangle(result, buff=0.2, stroke_color=SAGE, stroke_width=3)
        self.play(ShowCreation(box))
        self.wait(2.5)
