"""Clips for /learnings/raid-parity."""

from manimlib import *

from style import FADED, SAGE, Clip, split_formula, words

# XOR, with the spacing TeX gives a binary operator (a piece on its own
# loses it)
X = R"\mskip\medmuskip\oplus\mskip\medmuskip"
OLD_P = R"P_{\text{old}}"
OLD_D = R"D_{\text{old}}"
NEW_P = R"P_{\text{new}}"
NEW_D = R"D_{\text{new}}"


class ParityUpdate(Clip):
    """Why a write needs only the old data and the old parity: call the rest
    of the row R, peel the old data off the old parity to get R, and put the
    new data on. Then the same with four-bit blocks."""

    def construct(self):
        size = 68
        old, op = split_formula(OLD_P, "=", OLD_D, X, "R", font_size=size, t2c={"R": FADED})
        new, np_ = split_formula(NEW_P, "=", NEW_D, X, "R", font_size=size, t2c={"R": FADED})
        old.move_to(UP * 2.9 + LEFT * 3.3)
        new.move_to(UP * 2.9 + RIGHT * 3.3)
        rest = words("R: every other disk in the row", font_size=38, color=FADED)
        rest.next_to(VGroup(old, new), DOWN, buff=0.45)

        self.play(Write(old), run_time=1.5)
        self.play(FadeIn(rest, shift=0.2 * UP))
        self.wait(0.5)
        self.play(TransformFromCopy(op, np_), run_time=1.3)
        self.wait(0.7)

        # R is what we don't want to read: peel the old data off the old parity
        peel, pp = split_formula(
            OLD_P, X, OLD_D, "=", OLD_D, X, OLD_D, X, "R",
            font_size=size, t2c={"R": FADED},
        )
        peel.move_to(UP * 0.6)
        self.play(
            FadeOut(rest),
            TransformFromCopy(op[0], pp[0]),
            FadeIn(pp[1:3], shift=0.2 * DOWN),
            TransformFromCopy(op[1], pp[3]),
            FadeIn(pp[4:6], shift=0.2 * DOWN),
            TransformFromCopy(op[2:], pp[6:]),
            run_time=1.6,
        )
        # The same block twice cancels
        strike = Line(pp[4].get_corner(DL), pp[6].get_corner(UR), stroke_color=SAGE, stroke_width=6)
        zero = words(R"the same block twice: $D \oplus D = 0$", font_size=38, color=SAGE)
        zero.next_to(peel, DOWN, buff=0.4)
        self.play(ShowCreation(strike), FadeIn(zero, shift=0.2 * UP))
        self.wait(0.8)
        got, gp = split_formula(OLD_P, X, OLD_D, "=", "R", font_size=size, t2c={"R": FADED})
        got.move_to(peel)
        self.play(
            ReplacementTransform(pp[0:4], gp[0:4]),
            ReplacementTransform(pp[8], gp[4]),
            FadeOut(pp[4:8]),
            FadeOut(strike),
            FadeOut(zero),
            run_time=1.2,
        )
        self.wait(0.5)

        # Put that in place of R in the new row
        result, rp = split_formula(
            NEW_P, "=", OLD_P, X, OLD_D, X, NEW_D,
            font_size=76, t2c={NEW_P: SAGE},
        )
        result.move_to(DOWN * 1.5)
        self.play(
            TransformFromCopy(np_[0:2], rp[0:2]),
            TransformFromCopy(gp[0:3], rp[2:5]),
            TransformFromCopy(np_[3], rp[5]),
            TransformFromCopy(np_[2], rp[6]),
            run_time=2,
        )
        self.wait(0.6)
        self.play(FadeOut(VGroup(old, new, got)), result.animate.to_edge(UP, buff=1.1), run_time=1.2)

        # With four-bit blocks: the other disks are never read
        nums, nump = split_formula(
            "1010", "=", "0011", X, "0110", X, "1111",
            font_size=70, t2c={"1010": SAGE},
        )
        nums.next_to(result, DOWN, buff=0.8)
        self.play(
            LaggedStart(
                FadeIn(nump[1]),
                TransformFromCopy(rp[2], nump[2]),
                FadeIn(nump[3]),
                TransformFromCopy(rp[4], nump[4]),
                FadeIn(nump[5]),
                TransformFromCopy(rp[6], nump[6]),
                lag_ratio=0.25,
            ),
            run_time=2.2,
        )
        self.play(FadeIn(nump[0], shift=0.2 * RIGHT))
        self.wait(0.4)

        cost = words(
            R"read old $D$ and old $P$, write new $D$ and new $P$:\\4 disk operations, however many disks",
            font_size=42,
        )
        cost.to_edge(DOWN, buff=1.0)
        self.play(FadeIn(cost, shift=0.2 * UP))
        self.wait(3)
