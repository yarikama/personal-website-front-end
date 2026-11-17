"""Clips for /learnings/scaling-laws."""

from manimlib import *

from style import FADED, SAGE, Clip, formula, split_formula, split_words, words


# An operator in a piece of its own loses its spacing, so it carries it
APPROX = R"\mskip\thickmuskip\approx\mskip\thickmuskip"


class TrainingCost(Clip):
    """What one token costs each parameter: 2 operations forward, about 4
    back, 6 in all; over N parameters and D tokens, C is about 6ND; then
    Chinchilla's 70 billion parameters and 1.4 trillion tokens dropped in,
    about 5.9 x 10^23 operations."""

    def construct(self):
        said = words("one token, through one parameter", font_size=40, color=FADED)
        said.to_edge(UP, buff=0.9)
        self.play(Write(said), run_time=1.2)

        # Forward: a multiply and an add
        fwd_said, fs = split_words("forward:", "a multiply and an add", font_size=38)
        fs[0].set_fill(FADED)
        fwd_n = formula("2", font_size=60, color=SAGE)
        # Backward: about twice the forward
        back_said, bs = split_words("backward:", "about twice as much", font_size=38)
        bs[0].set_fill(FADED)
        back_n = formula("4", font_size=60, color=SAGE)

        fwd_said.next_to(said, DOWN, buff=0.8).shift(1.0 * LEFT)
        back_said.next_to(fwd_said, DOWN, buff=0.5, aligned_edge=LEFT)
        fwd_n.next_to(fwd_said, RIGHT, buff=0.9)
        back_n.next_to(back_said, RIGHT, buff=0.9).align_to(fwd_n, LEFT)

        self.play(FadeIn(fwd_said, shift=0.2 * RIGHT), run_time=1.0)
        self.play(FadeTransform(fs[1].copy(), fwd_n), run_time=1.0)
        self.wait(0.4)
        self.play(FadeIn(back_said, shift=0.2 * RIGHT), run_time=1.0)
        self.play(FadeTransform(bs[1].copy(), back_n), run_time=1.0)
        self.wait(0.4)

        # 2 + 4 = 6 per parameter per token
        six, sx = split_formula("2", "+", "4", "=", "6", font_size=64)
        sx[4].set_fill(SAGE)
        per = words("operations per parameter, per token", font_size=36, color=FADED)
        six.next_to(back_said, DOWN, buff=0.8).set_x(0)
        per.next_to(six, DOWN, buff=0.3)
        self.play(
            TransformFromCopy(fwd_n, sx[0]),
            FadeIn(sx[1]),
            TransformFromCopy(back_n, sx[2]),
            FadeIn(sx[3]),
            run_time=1.3,
        )
        self.play(FadeIn(sx[4], scale=1.2), FadeIn(per, shift=0.2 * DOWN), run_time=1.0)
        self.wait(0.8)

        # Over N parameters and D tokens: C is about 6ND
        cost, cp = split_formula("C", APPROX, "6", "N", "D", font_size=84)
        cp[2].set_fill(SAGE)
        cost.to_edge(UP, buff=1.5)
        n_name = words("parameters", font_size=34, color=FADED)
        d_name = words("tokens", font_size=34, color=FADED)
        self.play(
            FadeOut(VGroup(said, fwd_said, back_said, fwd_n, back_n, sx[0:4], per)),
            ReplacementTransform(sx[4], cp[2]),
            FadeIn(VGroup(cp[0], cp[1], cp[3], cp[4])),
            run_time=1.4,
        )
        n_name.next_to(cp[3], DOWN, buff=0.35).shift(0.5 * LEFT)
        d_name.next_to(cp[4], DOWN, buff=0.35).shift(0.5 * RIGHT)
        self.play(FadeIn(n_name, shift=0.2 * UP), FadeIn(d_name, shift=0.2 * UP), run_time=1.0)
        self.wait(0.8)

        # Chinchilla's numbers dropped in
        who = words("Chinchilla", font_size=38, color=FADED)
        plug, pp = split_formula(
            "C", APPROX, "6", R"\times", R"70{\times}10^{9}", R"\times", R"1.4{\times}10^{12}",
            font_size=60,
        )
        who.next_to(VGroup(n_name, d_name), DOWN, buff=0.8)
        plug.next_to(who, DOWN, buff=0.4)
        self.play(FadeIn(who), run_time=0.6)
        self.play(
            TransformFromCopy(cp[0], pp[0]),
            TransformFromCopy(cp[1], pp[1]),
            TransformFromCopy(cp[2], pp[2]),
            FadeIn(pp[3]),
            FadeTransform(n_name.copy(), pp[4]),
            FadeIn(pp[5]),
            FadeTransform(d_name.copy(), pp[6]),
            run_time=1.8,
        )
        self.wait(0.6)

        answer = formula(R"\approx 5.9 \times 10^{23}", R"\text{ operations}", font_size=60, color=SAGE)
        answer.next_to(plug, DOWN, buff=0.5)
        self.play(FadeIn(answer, shift=0.2 * UP), run_time=1.2)
        self.play(Indicate(answer, color=SAGE, scale_factor=1.06))
        self.wait(2.5)
