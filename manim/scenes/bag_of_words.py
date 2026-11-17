"""Clips for /learnings/bag-of-words."""

from manimlib import *

from style import FADED, INK, RULE, SAGE, Clip, formula, split_formula, words


class CardScore(Clip):
    """A comment card becomes counts, the counts meet the learned weights in
    one sum, and the sum becomes a chance. The numbers are the page's
    (src/learnings/bag-of-words/model.ts, checked in model.test.ts)."""

    def construct(self):
        card = words(R"``Good coffee, good cake!''", font_size=48)
        card.to_edge(UP, buff=0.8)
        self.play(Write(card), run_time=1.4)

        # The card as counts: order and punctuation gone
        counts, cp = split_formula(
            R"\mathrm{good}\!:2", R"\quad", R"\mathrm{coffee}\!:1", R"\quad", R"\mathrm{cake}\!:1",
            font_size=56,
        )
        counts.next_to(card, DOWN, buff=0.55)
        rest = words("every other word: $0$", font_size=36, color=FADED).next_to(counts, DOWN, buff=0.25)
        self.play(
            LaggedStart(*(FadeTransform(card.copy(), cp[i]) for i in (0, 2, 4)), lag_ratio=0.25),
            run_time=1.6,
        )
        self.play(FadeIn(rest, shift=0.15 * DOWN), run_time=0.7)
        self.wait(0.8)

        # The one line, in words, then in symbols
        said = words(R"score $=$ start $+$ the sum of weight $\times$ count", font_size=42, color=FADED)
        said.next_to(rest, DOWN, buff=0.6)
        self.play(Write(said), run_time=1.6)
        line, lp = split_formula(
            "z", "=", "b", "+", R"\sum", R"w", R"\times", R"x",
            font_size=64,
        )
        line.move_to(said)
        self.play(FadeTransform(said, line), run_time=1.0)
        weight = words("weight", font_size=36, color=SAGE).next_to(lp[5], DOWN, buff=0.35)
        count = words("count", font_size=36, color=SAGE).next_to(lp[7], DOWN, buff=0.35).shift(0.35 * RIGHT)
        weight.shift(0.15 * LEFT)
        self.play(FadeIn(weight, shift=0.15 * UP), FadeIn(count, shift=0.15 * UP), run_time=0.8)
        self.wait(0.8)

        # The card's numbers dropped in
        rule = Line(LEFT * 5.5, RIGHT * 5.5, stroke_color=RULE, stroke_width=2)
        rule.next_to(VGroup(weight, count), DOWN, buff=0.4).set_x(0)
        sums, sp = split_formula(
            "z", "=", "0.21", "+", R"1.03\times 2", "+", R"(-0.10)\times 1", "+", R"(-0.06)\times 1", "=", "2.11",
            font_size=50,
            t2c={"2.11": SAGE},
        )
        sums.next_to(rule, DOWN, buff=0.4).set_x(0)
        self.play(ShowCreation(rule), FadeIn(sp[0:3]), run_time=0.9)
        self.play(
            LaggedStart(
                FadeIn(sp[3]),
                TransformFromCopy(cp[0], sp[4]),
                FadeIn(sp[5]),
                TransformFromCopy(cp[2], sp[6]),
                FadeIn(sp[7]),
                TransformFromCopy(cp[4], sp[8]),
                lag_ratio=0.25,
            ),
            run_time=2.4,
        )
        self.play(FadeIn(sp[9:], shift=0.2 * LEFT), run_time=0.7)
        self.wait(0.6)

        # The sigmoid turns the score into a chance
        chance, hp = split_formula(R"\sigma(2.11)", "=", "0.89", font_size=56, t2c={"0.89": SAGE})
        chance.next_to(sums, DOWN, buff=0.45).set_x(-0.9)
        happy = words("chance of happy", font_size=40, color=SAGE).next_to(chance, RIGHT, buff=0.45)
        self.play(TransformFromCopy(sp[10], hp[0]), FadeIn(hp[1:]), run_time=1.0)
        self.play(FadeIn(happy, shift=0.2 * LEFT), Indicate(hp[2], color=SAGE, scale_factor=1.15), run_time=1.0)
        self.wait(3.0)
