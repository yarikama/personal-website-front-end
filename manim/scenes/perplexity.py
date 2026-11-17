"""Clips for /learnings/perplexity."""

from manimlib import *

from style import FADED, INK, RULE, SAGE, Clip, formula, split_formula, words


class PerWordChance(Clip):
    """The story's four chances multiplied, the one chance that gives the
    same total, turned over: 4. Then the same steps in symbols, and the log
    form a model is scored with."""

    def construct(self):
        # The four chances, multiplied
        said = words("the chances of the words that came, multiplied", font_size=34, color=FADED)
        total, tp = split_formula(
            R"\tfrac18", R"\times", R"\tfrac18", R"\times", R"\tfrac12", R"\times", R"\tfrac12", "=", R"\tfrac{1}{256}",
            font_size=60,
        )
        said.to_edge(UP, buff=0.8)
        total.next_to(said, DOWN, buff=0.45)
        self.play(FadeIn(said, shift=0.2 * DOWN))
        self.play(LaggedStart(*(FadeIn(p, shift=0.2 * UP) for p in tp[:7]), lag_ratio=0.25), run_time=2)
        self.play(FadeIn(tp[7:], shift=0.2 * LEFT))
        self.wait(0.8)

        # The one chance that, at every word, gives the same total
        said2 = words("one chance, the same at every word", font_size=34, color=FADED)
        root, rp = split_formula(R"\Big(\tfrac{1}{256}\Big)^{1/4}", "=", R"\tfrac14", font_size=60, t2c={R"\tfrac14": SAGE})
        said2.next_to(total, DOWN, buff=0.7)
        root.next_to(said2, DOWN, buff=0.4)
        self.play(FadeIn(said2, shift=0.2 * DOWN))
        self.play(TransformFromCopy(tp[8], rp[0]), run_time=1.2)
        self.play(FadeIn(rp[1:], shift=0.2 * LEFT))
        self.wait(0.8)

        # Turned over: as torn as a blind pick among four
        said3 = words("turned over: a blind pick among", font_size=34, color=FADED)
        four = formula("4", font_size=60, color=SAGE)
        said3.next_to(root, DOWN, buff=0.7)
        four.next_to(said3, RIGHT, buff=0.3)
        self.play(FadeIn(said3, shift=0.2 * DOWN))
        self.play(TransformFromCopy(rp[2], four), run_time=1.2)
        self.wait(1.2)

        # The same steps in symbols
        story, sp = split_formula(
            R"\Big(\tfrac18\cdot\tfrac18\cdot\tfrac12\cdot\tfrac12\Big)^{-1/4}", "=", "4", font_size=56
        )
        sp[2].set_fill(SAGE)
        story.to_edge(UP, buff=0.8)
        self.play(
            FadeOut(VGroup(said, said2, said3, root)),
            FadeTransform(total, sp[0]),
            FadeIn(sp[1]),
            ReplacementTransform(four, sp[2]),
            run_time=1.6,
        )

        rule = Line(LEFT * 5, RIGHT * 5, stroke_color=RULE, stroke_width=2).next_to(story, DOWN, buff=0.5)
        general, gp = split_formula(
            R"\mathrm{perplexity}", "=", R"P(w_1 \dots w_T)", R"^{-1/T}",
            font_size=60,
        )
        general.next_to(rule, DOWN, buff=0.5)
        # In logs: the average log-chance per word, flipped and undone
        logs, lp = split_formula(
            "=", R"\exp\Big(", "-", R"\tfrac1T\sum_{t=1}^{T}\log P(w_t \mid w_{<t})", R"\Big)",
            font_size=60,
        )
        logs.next_to(general, DOWN, buff=0.5).align_to(gp[1], LEFT)
        # Both lines, lined up on their equals signs, centred together
        shift = -VGroup(general, logs).get_center()[0]
        general.shift(shift * RIGHT)
        logs.shift(shift * RIGHT)
        self.play(ShowCreation(rule))
        self.play(FadeIn(gp[0]), FadeIn(gp[1]))
        self.play(FadeIn(gp[2], shift=0.2 * UP), run_time=1)
        self.play(FadeIn(gp[3], shift=0.2 * UP), run_time=1)
        self.wait(0.8)

        self.play(LaggedStart(*(FadeIn(p, shift=0.2 * UP) for p in lp), lag_ratio=0.2), run_time=2)
        brace = Brace(lp[3], DOWN, buff=0.15).set_fill(SAGE)
        note = words("the average log-chance per word", font_size=34, color=SAGE).next_to(brace, DOWN, buff=0.15)
        self.play(GrowFromCenter(brace), FadeIn(note, shift=0.2 * DOWN))
        self.wait(3)
