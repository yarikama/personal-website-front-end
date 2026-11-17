"""Clips for /learnings/skip-gram."""

from manimlib import *

from style import FADED, INK, RULE, SAGE, Clip, formula, split_formula, split_words, words

DRINKS = R"u_{\text{drinks}}"
CAT = R"v_{\text{cat}}"


class NegativeSampling(Clip):
    """The softmax chance that drinks is cat's neighbour, whose bottom line
    scores every word in the vocabulary. Negative sampling keeps the top as
    a yes for the real neighbour and swaps the bottom for a no to each of k
    random words. Then the count: 6 scores with k = 5, not 692,000."""

    def construct(self):
        said = words("the chance drinks is cat's neighbour", font_size=42, color=FADED)
        said.to_edge(UP, buff=0.8)

        # The softmax, built as a fraction so its bottom line can be picked out
        lhs = formula(R"P(\text{drinks}\mid\text{cat}) =", font_size=64)
        top = formula(R"e^{" + DRINKS + R"\cdot " + CAT + "}", font_size=64)
        bottom = formula(R"\sum_{w\in V} e^{u_w\cdot " + CAT + "}", font_size=64)
        stack = VGroup(top, bottom).arrange(DOWN, buff=0.45)
        bar = Line(LEFT, RIGHT, stroke_color=INK, stroke_width=3).set_width(stack.get_width() + 0.2)
        bar.move_to(stack).set_y((top.get_bottom()[1] + bottom.get_top()[1]) / 2)
        fraction = VGroup(stack, bar)
        softmax = VGroup(lhs, fraction).arrange(RIGHT, buff=0.3)
        softmax.next_to(said, DOWN, buff=1.0)

        self.play(Write(said), run_time=1.4)
        self.play(FadeIn(lhs, shift=0.2 * RIGHT), run_time=0.8)
        self.play(FadeIn(top, shift=0.2 * DOWN), ShowCreation(bar), run_time=1.0)
        self.play(FadeIn(bottom, shift=0.2 * UP), run_time=1.0)
        self.wait(0.8)

        # The bottom line: a score for every word, for every pair
        self.play(bottom.animate.set_fill(SAGE), run_time=0.6)
        every = words("a score for every word: 692,000, for every pair", font_size=40, color=SAGE)
        every.next_to(softmax, DOWN, buff=0.6)
        self.play(FadeIn(every, shift=0.2 * DOWN))
        self.wait(1.8)

        # Ask yes or no instead
        neg, parts = split_formula(
            R"\log\sigma(" + DRINKS + R"\cdot " + CAT + ")",
            "+",
            R"\sum_{i=1}^{k}",
            R"\log\sigma(-u_{w_i}\cdot " + CAT + ")",
            font_size=60,
        )
        neg.move_to(softmax)
        instead = words("instead: one yes and $k$ no's", font_size=42, color=FADED).move_to(said)
        self.play(FadeTransform(said, instead), FadeOut(every), FadeOut(lhs), FadeOut(bar), run_time=0.9)
        self.play(
            FadeTransform(top, parts[0]),
            FadeIn(parts[1]),
            FadeTransform(bottom, parts[2:]),
            run_time=1.6,
        )
        parts[2:].set_fill(INK)

        yes = Brace(parts[0], DOWN, buff=0.15).set_fill(SAGE)
        yes_says = words("yes to the real neighbour", font_size=38, color=SAGE).next_to(yes, DOWN, buff=0.2)
        no = Brace(parts[2:], DOWN, buff=0.15).set_fill(INK)
        no_says = words("no to $k$ random words", font_size=38).next_to(no, DOWN, buff=0.2)
        self.play(GrowFromCenter(yes), FadeIn(yes_says, shift=0.2 * DOWN))
        self.wait(0.6)
        self.play(GrowFromCenter(no), FadeIn(no_says, shift=0.2 * DOWN))
        self.wait(1.2)

        # The count
        rule = Line(LEFT * 5.5, RIGHT * 5.5, stroke_color=RULE, stroke_width=2)
        rule.next_to(VGroup(yes_says, no_says), DOWN, buff=0.6).set_x(0)
        count, cp = split_words("with $k = 5$:", "$1 + 5 = 6$ scores,", "not 692,000", font_size=46)
        cp[1].set_fill(SAGE)
        count.next_to(rule, DOWN, buff=0.45).set_x(0)
        self.play(ShowCreation(rule), FadeIn(cp[0]), run_time=0.8)
        self.play(FadeIn(cp[1], shift=0.2 * LEFT), run_time=0.8)
        self.play(FadeIn(cp[2]), run_time=0.8)
        self.play(Indicate(cp[1], color=SAGE, scale_factor=1.15))
        whole = VGroup(instead, neg, yes, yes_says, no, no_says, rule, count)
        self.play(whole.animate.center(), run_time=0.8)
        self.wait(3)
