"""Clips for /learnings/neural-networks."""

from manimlib import *

from style import FADED, SAGE, Clip, split_formula, words

# The Garamond maths has no partial sign: borrow newtx's
PARTIAL = R"\text{\usefont{OML}{ntxmi}{m}{it}\char64}"


# Its delta looks like a partial sign too: borrow newtx's as well
DELTA = R"\text{\usefont{OML}{ntxmi}{m}{it}\char14}"


def slope(of: str) -> str:
    return Rf"\frac{{{PARTIAL} L}}{{{PARTIAL} {of}}}"


class Backprop(Clip):
    """The forward pass in two lines, then the backward pass in three: your
    blame, a helper's share of it, a word weight's slope, each built from the
    one above. Then the story's random start, on "not boring", dropped in."""

    def construct(self):
        # Forward: the helpers' flags, then your chance
        head = words("forward: words, then flags, then your chance", font_size=36, color=FADED)
        head.to_edge(UP, buff=0.7)
        flags, fp = split_formula("z", "=", R"\sigma(", "W x + b", ")", font_size=66)
        chance, cp = split_formula("p", "=", R"\sigma(", R"v \cdot", "z", "+", "c", ")", font_size=66)
        cost, kp = split_formula("L", "=", R"-\ln", R"(\text{chance of the true label})", font_size=52)
        forward = VGroup(flags, chance, cost).arrange(DOWN, buff=0.55, aligned_edge=LEFT)
        forward.move_to(0.3 * DOWN)

        self.play(Write(head), run_time=1.4)
        self.play(FadeIn(flags, shift=0.2 * DOWN), run_time=0.9)
        self.play(FadeIn(cp[0:4], shift=0.2 * DOWN), FadeIn(cp[5:], shift=0.2 * DOWN), run_time=0.8)
        self.play(TransformFromCopy(fp[0], cp[4]), run_time=0.9)
        self.play(FadeIn(cost, shift=0.2 * DOWN), run_time=0.9)
        self.wait(1.2)

        # Backward: each line reuses the blame above it
        back = words("backward: each blame reuses the one above", font_size=36, color=SAGE).move_to(head)
        one, op = split_formula(DELTA, "=", "p", "-", "y", font_size=66)
        op[0].set_color(SAGE)
        two, tp = split_formula(
            DELTA + "_k", "=", DELTA, R"\, v_k", R"\, z_k(1-z_k)",
            font_size=66,
        )
        three, hp = split_formula(slope("W_{kj}"), "=", DELTA + "_k", R"\, x_j", font_size=66)
        lines = VGroup(one, two, three).arrange(DOWN, buff=0.6, aligned_edge=LEFT)
        lines.move_to(0.3 * DOWN).set_x(-1.4)
        notes = VGroup(
            words("your blame", font_size=34, color=FADED),
            words(R"helper $k$'s share", font_size=34, color=FADED),
            words("a word weight's slope", font_size=34, color=FADED),
        )
        for note, line in zip(notes, lines):
            note.next_to(line, RIGHT, buff=0.8).set_x(4.4)

        self.play(FadeOut(forward, shift=0.3 * UP), FadeTransform(head, back), run_time=1.0)
        self.play(FadeIn(one, shift=0.2 * DOWN), FadeIn(notes[0]), run_time=1.0)
        self.wait(0.6)
        tp[0].set_color(SAGE)
        self.play(FadeIn(tp[0:2]), FadeIn(notes[1]), run_time=0.7)
        self.play(TransformFromCopy(op[0], tp[2]), run_time=1.0)
        self.play(FadeIn(tp[3:], shift=0.2 * LEFT), run_time=0.9)
        self.wait(0.6)
        self.play(FadeIn(hp[0:2]), FadeIn(notes[2]), run_time=0.7)
        self.play(TransformFromCopy(tp[0], hp[2]), run_time=1.0)
        self.play(FadeIn(hp[3], shift=0.2 * LEFT), run_time=0.8)
        self.wait(1.4)

        # The story's random start, on "not boring"
        start = words(R"the random start, on ``not boring''", font_size=36, color=FADED).move_to(back)
        one_n, on = split_formula(DELTA, "=", "0.30", "-", "1", "=", "-0.70", font_size=66)
        on[0].set_color(SAGE)
        two_n, tn = split_formula(
            DELTA + "_1", "=", "(-0.70)", "(-0.47)", "(0.24)", "=", "+0.08",
            font_size=66,
        )
        three_n, hn = split_formula(
            slope(R"W_{1,\mathrm{not}}"), "=", "(+0.08)", "(1)", "=", "+0.08",
            font_size=66,
        )
        tn[0].set_color(SAGE)
        for new, old in ((one_n, one), (two_n, two), (three_n, three)):
            new.move_to(old, aligned_edge=LEFT)
        self.play(FadeTransform(back, start), FadeOut(notes), run_time=0.8)
        self.play(*(FadeTransform(op[i], on[i]) for i in range(5)), FadeIn(on[5:], shift=0.2 * LEFT), run_time=1.2)
        self.play(*(FadeTransform(tp[i], tn[i]) for i in range(5)), FadeIn(tn[5:], shift=0.2 * LEFT), run_time=1.2)
        self.play(*(FadeTransform(hp[i], hn[i]) for i in range(4)), FadeIn(hn[4:], shift=0.2 * LEFT), run_time=1.2)
        self.play(Indicate(hn[5], color=SAGE, scale_factor=1.15))
        self.wait(3)
