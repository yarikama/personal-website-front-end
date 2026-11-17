"""Clips for /learnings/pretraining-objectives."""

from manimlib import *

from style import FADED, INK, RULE, SAGE, Clip, formula, split_formula, words


class MaskedLoss(Clip):
    """The next-word loss, then the two things BERT changes in it: which
    words are guessed (only the hidden ones) and what each guess sees (the
    whole sentence with its blanks). Then the story's two blanks dropped in."""

    def construct(self):
        said = words("next word: guess every word from the ones before it", font_size=36, color=FADED)
        said.to_edge(UP, buff=0.8)

        lm, lp = split_formula(
            "L", "=", R"-\sum_{t=1}^{n}", R"\ln P(\,x_t", R"\mskip\thickmuskip\mid\mskip\thickmuskip", R"x_1 \ldots x_{t-1}\,)",
            font_size=58,
        )
        lm.next_to(said, DOWN, buff=0.7)

        self.play(Write(said), run_time=1.4)
        self.play(FadeIn(lp[0:2]), run_time=0.6)
        self.play(FadeIn(lp[2:], shift=0.2 * LEFT), run_time=1.0)
        self.wait(1.0)

        # BERT: the sum shrinks to the hidden places, the condition grows to
        # the whole sentence with gaps
        why = words("masked words: guess only the hidden ones, seeing both sides", font_size=36, color=FADED).move_to(said)
        mlm, mp = split_formula(
            "L", "=", R"-\sum_{i \in M}", R"\ln P(\,x_i", R"\mskip\thickmuskip\mid\mskip\thickmuskip", R"\tilde{x}\,)",
            font_size=58,
            t2c={R"-\sum_{i \in M}": SAGE, R"\tilde{x}\,)": SAGE},
        )
        mlm.move_to(lm)
        self.play(FadeTransform(said, why), run_time=0.8)
        self.play(*(FadeTransform(lp[i], mp[i]) for i in range(6)), run_time=1.6)

        where = Brace(mp[2], DOWN, buff=0.15).set_fill(SAGE)
        where_w = words("the hidden places", font_size=32, color=SAGE).next_to(where, DOWN, buff=0.15)
        what = Brace(mp[5], DOWN, buff=0.15).set_fill(SAGE)
        what_w = words("the sentence with blanks", font_size=32, color=SAGE).next_to(what, DOWN, buff=0.15)
        self.play(GrowFromCenter(where), FadeIn(where_w, shift=0.2 * DOWN))
        self.play(GrowFromCenter(what), FadeIn(what_w, shift=0.2 * DOWN))
        self.wait(1.4)

        # The story's sentence, with its two blanks
        rule = Line(LEFT * 5.8, RIGHT * 5.8, stroke_color=RULE, stroke_width=2)
        rule.next_to(VGroup(where_w, what_w), DOWN, buff=0.5).set_x(0)
        line = words(R"we sat on the \underline{\ \ ?\ \ } of the river and watched the \underline{\ \ ?\ \ } go by", font_size=34)
        line.next_to(rule, DOWN, buff=0.35).set_x(0)
        gave = words(R"the model gives bank $0.40$, boats $0.20$", font_size=34, color=FADED)
        gave.next_to(line, DOWN, buff=0.3).set_x(0)
        self.play(ShowCreation(rule), FadeIn(line), run_time=0.9)
        self.play(FadeIn(gave, shift=0.2 * DOWN), run_time=0.8)
        self.wait(0.6)

        sums, sp = split_formula(
            R"-\ln 0.40", "-", R"\ln 0.20", "=", "0.92", "+", "1.61", "=", "2.53",
            font_size=56,
            t2c={"2.53": SAGE},
        )
        sums.next_to(gave, DOWN, buff=0.4).set_x(0)
        self.play(Indicate(mp[2:6], color=SAGE, scale_factor=1.05), run_time=0.9)
        self.play(FadeIn(sp[0:3], shift=0.2 * DOWN), run_time=1.0)
        self.play(FadeIn(sp[3:7], shift=0.2 * LEFT), run_time=1.0)
        self.play(FadeIn(sp[7:], shift=0.2 * LEFT), run_time=0.8)
        self.play(Indicate(sp[8], color=SAGE, scale_factor=1.15))
        self.wait(2.5)
