"""Clips for /learnings/two-phase-locking."""

from manimlib import *

from style import FADED, INK, SAGE, Clip, split_formula, words

# Relations set apart in pieces of their own lose TeX's spacing: spelled out
LE = R"\mskip\thickmuskip\le\mskip\thickmuskip"
LT = R"\mskip\thickmuskip<\mskip\thickmuskip"


class LockPointOrder(Clip):
    """Why 2PL gives a serial order. Ti and Tj conflict on X, Ti first: Ti
    must unlock X before Tj locks it. Ti unlocks nothing before its lock
    point; Tj has X locked by its own. Chained: Ti's lock point comes first.
    Every conflict points forward in lock-point order, so there is no cycle."""

    def construct(self):
        setup = words(R"$T_i$ and $T_j$ both use $X$, $T_i$ first, and one of them writes", font_size=36, color=FADED)
        setup.to_edge(UP, buff=0.8)

        chain, cp = split_formula(
            R"\mathrm{lp}(T_i)", LE, R"u_i(X)", LT, R"l_j(X)", LE, R"\mathrm{lp}(T_j)",
            font_size=60,
        )
        chain.move_to(UP * 0.9)
        cp[0].set_fill(SAGE)
        cp[6].set_fill(SAGE)

        def explain(text: str) -> Mobject:
            return words(text, font_size=36).move_to(DOWN * 0.9)

        self.play(FadeIn(setup, shift=0.2 * DOWN), run_time=1.2)
        self.wait(0.6)

        # The middle: one lock per item, so X changes hands
        why = explain(R"$T_i$ must unlock $X$ before $T_j$ can lock it")
        self.play(FadeIn(cp[2:5], shift=0.2 * UP), FadeIn(why), run_time=1.4)
        self.wait(1.6)

        # The left: no unlock before the lock point
        left = explain(R"$T_i$ unlocks nothing before its lock point")
        self.play(FadeIn(cp[0:2], shift=0.3 * RIGHT), FadeTransform(why, left), run_time=1.4)
        self.wait(1.6)

        # The right: every lock by the lock point
        right = explain(R"$T_j$ takes every lock, $X$'s too, by its lock point")
        self.play(FadeIn(cp[5:7], shift=0.3 * LEFT), FadeTransform(left, right), run_time=1.4)
        self.wait(1.6)

        # Drop the middle: the lock points are in order
        result, rp = split_formula(R"\mathrm{lp}(T_i)", LT, R"\mathrm{lp}(T_j)", font_size=72)
        result.move_to(DOWN * 0.9)
        rp[0].set_fill(SAGE)
        rp[2].set_fill(SAGE)
        self.play(
            FadeOut(right),
            TransformFromCopy(cp[0], rp[0]),
            FadeIn(rp[1]),
            TransformFromCopy(cp[6], rp[2]),
            run_time=1.8,
        )
        self.wait(0.8)

        # So every arrow of the precedence graph points forward in time
        end = words(
            R"Every conflict points forward in lock-point order:\\no cycle, and the serial order is the order of lock points",
            font_size=34,
            color=INK,
        )
        end.to_edge(DOWN, buff=0.8)
        self.play(FadeIn(end, shift=0.2 * UP), run_time=1.4)
        self.wait(3.5)
