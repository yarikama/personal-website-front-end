"""Clips for /learnings/instruction-tuning."""

from manimlib import *

from style import FADED, INK, RULE, SAGE, Clip, formula, split_formula, words

# From src/learnings/instruction-tuning/model.ts (WORKED, ANSWERS_ONLY):
# three tokens of "The Tagus, the Ebro and the Douro." with the chance a
# pretrained model gives each, its surprise, and the answer's mean loss
WORKED = [(R"\text{the}", "0.90", "0.11"), (R"\text{Tagus}", "0.20", "1.61"), (R"\texttt{<|end|>}", "0.01", "4.61")]
MEAN = "1.12"


class SftLoss(Clip):
    """The next-word loss of pretraining, then the one change instruction
    tuning makes: the sum runs over the response's positions only, averaged,
    while each guess still reads everything before it. Then three tokens of
    the story's answer dropped in."""

    def construct(self):
        said = words("pretraining: guess every token from the ones before it", font_size=36, color=FADED)
        said.to_edge(UP, buff=0.7)

        lm, lp = split_formula(
            "L", "=", R"-\sum_{t=1}^{n}", R"\ln P(\,x_t", R"\mskip\thickmuskip\mid\mskip\thickmuskip", R"x_{<t}\,)",
            font_size=60,
        )
        lm.next_to(said, DOWN, buff=0.6)

        self.play(Write(said), run_time=1.4)
        self.play(FadeIn(lp[0:2]), run_time=0.6)
        self.play(FadeIn(lp[2:], shift=0.2 * LEFT), run_time=1.0)
        self.wait(1.0)

        # Instruction tuning: only the response's positions, averaged
        why = words("instruction tuning: score only the response", font_size=36, color=FADED).move_to(said)
        sft, sp = split_formula(
            "L", "=", R"-\frac{1}{|R|}\sum_{t \in R}", R"\ln P(\,x_t", R"\mskip\thickmuskip\mid\mskip\thickmuskip", R"x_{<t}\,)",
            font_size=60,
            t2c={R"-\frac{1}{|R|}\sum_{t \in R}": SAGE},
        )
        sft.move_to(lm)
        self.play(FadeTransform(said, why), run_time=0.8)
        self.play(*(FadeTransform(lp[i], sp[i]) for i in range(6)), run_time=1.6)

        where = Brace(sp[2], DOWN, buff=0.12).set_fill(SAGE)
        where_w = words(R"the response's\\tokens", font_size=32, color=SAGE).next_to(where, DOWN, buff=0.12)
        what = Brace(sp[5], DOWN, buff=0.12).set_fill(FADED)
        what_w = words(R"instruction and\\answer so far", font_size=32, color=FADED).next_to(what, DOWN, buff=0.12)
        self.play(GrowFromCenter(where), FadeIn(where_w, shift=0.2 * DOWN))
        self.play(GrowFromCenter(what), FadeIn(what_w, shift=0.2 * DOWN))
        self.wait(1.4)

        # Three tokens of the story's answer
        rule = Line(LEFT * 5.8, RIGHT * 5.8, stroke_color=RULE, stroke_width=2)
        rule.next_to(VGroup(where_w, what_w), DOWN, buff=0.4).set_x(0)
        self.play(ShowCreation(rule), run_time=0.6)

        rows = VGroup()
        for token, chance, cost in WORKED:
            rows.add(
                VGroup(
                    formula(token, font_size=48, color=INK),
                    formula(R"-\ln " + chance, font_size=52, color=FADED),
                    formula("=" + R"\ " + cost, font_size=52, color=SAGE if token.startswith(R"\texttt") else INK),
                )
            )
        rows.arrange(DOWN, buff=0.3)
        rows.next_to(rule, DOWN, buff=0.35)
        for row in rows:
            for col, x in zip(row, (-3.6, 0.2, 3.0)):
                col.set_x(x)
        for row in rows:
            self.play(LaggedStart(*(FadeIn(c, shift=0.15 * UP) for c in row), lag_ratio=0.2), run_time=1.0)
            self.wait(0.4)

        mean = words(R"all ten tokens of the answer, averaged: $" + MEAN + "$", font_size=36, color=INK)
        mean.next_to(rows, DOWN, buff=0.4).set_x(0)
        self.play(FadeIn(mean, shift=0.2 * UP), run_time=0.9)
        self.play(Indicate(rows[2][2], color=SAGE, scale_factor=1.15))
        self.wait(3)
