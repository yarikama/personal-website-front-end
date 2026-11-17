"""Clips for /learnings/size-estimation."""

from manimlib import *

from style import FADED, SAGE, Clip, split_formula, split_words, words

LE = R"\mskip\thickmuskip\le\mskip\thickmuskip"


class JoinSize(Clip):
    """Where T(R)T(S)/max(V(R,Y), V(S,Y)) comes from. One row of R meets the
    rows of S with its Y value, T(S)/V(S,Y) of them, if its value is in S at
    all: true when S has the more values (containment). Every row of R does
    the same. The other way round divides by V(R,Y); either way, by the
    larger. Then 10,000 orders and 1,000 customers, 800 of them ordering."""

    def construct(self):
        # One row of R, in words then symbols
        title = words("One row of R matches", font_size=46, color=FADED)
        title.to_edge(UP, buff=1.0)
        said, sp = split_words("rows of S", "/", "values of Y in S", font_size=46)
        said.next_to(title, DOWN, buff=0.35)
        one, op = split_formula("T(S)", "/", "V(S,Y)", font_size=74)
        one.next_to(said, DOWN, buff=0.55)

        self.play(FadeIn(title, shift=0.2 * DOWN), Write(said), run_time=1.6)
        self.play(
            LaggedStart(*(FadeTransform(sp[i].copy(), op[i]) for i in range(3)), lag_ratio=0.2),
            run_time=1.6,
        )
        self.wait(0.4)

        # ... if its value is in S at all: the containment assumption
        cond = words(R"if its Y value is in S, as when $V(R,Y) \le V(S,Y)$", font_size=42, color=SAGE)
        cond.next_to(one, DOWN, buff=0.45)
        self.play(FadeIn(cond, shift=0.2 * DOWN), run_time=1)
        self.wait(1.2)

        # Every row of R does the same
        title2 = words("All the rows of R match", font_size=46, color=FADED).move_to(title)
        every, ep = split_formula("T(R)", R"\times", "T(S)", "/", "V(S,Y)", font_size=74)
        every.move_to(one)
        self.play(
            FadeOut(said),
            FadeTransform(title, title2),
            FadeIn(ep[0:2], shift=0.2 * RIGHT),
            ReplacementTransform(op[0], ep[2]),
            ReplacementTransform(op[1], ep[3]),
            ReplacementTransform(op[2], ep[4]),
            run_time=1.4,
        )
        self.wait(0.8)
        top = VGroup(every, cond)
        self.play(top.animate.shift(UP * 0.9), run_time=0.8)

        # The other way round, when R has the more values
        other, xp = split_formula("T(R)", R"\times", "T(S)", "/", "V(R,Y)", font_size=74)
        other.next_to(cond, DOWN, buff=0.6)
        cond2 = words(R"or the other way round, when $V(S,Y) \le V(R,Y)$", font_size=42, color=SAGE)
        cond2.next_to(other, DOWN, buff=0.45)
        self.play(
            TransformFromCopy(ep[0:4], xp[0:4]),
            FadeIn(xp[4], shift=0.2 * UP),
            FadeIn(cond2, shift=0.2 * DOWN),
            run_time=1.4,
        )
        self.wait(1.4)

        # Either way, divide by the larger
        rule, rp = split_formula(
            "T(R)", R"\times", "T(S)", "/", R"\max\big(V(R,Y),\, V(S,Y)\big)",
            font_size=74,
        )
        rp[4].set_fill(SAGE)
        rule.move_to(ORIGIN + UP * 0.6)
        larger = words("divide by the larger", font_size=46, color=SAGE)
        larger.next_to(rule, DOWN, buff=0.45)
        self.play(
            FadeOut(cond),
            FadeOut(cond2),
            FadeOut(title2),
            ReplacementTransform(ep[0:4], rp[0:4]),
            ReplacementTransform(xp[0:4], rp[0:4].copy()),
            FadeTransform(ep[4], rp[4]),
            FadeTransform(xp[4], rp[4].copy()),
            run_time=1.6,
        )
        self.remove(*self.mobjects)
        self.add(rule)
        self.play(rule.animate.to_edge(UP, buff=1.3), run_time=0.8)
        larger.next_to(rule, DOWN, buff=0.4)
        self.play(FadeIn(larger, shift=0.2 * DOWN), run_time=0.8)
        self.wait(0.8)

        # With numbers: 10,000 orders, 1,000 customers, 800 of them ordering
        given = words("10,000 orders · 1,000 customers · 800 have ordered", font_size=42, color=FADED)
        given.next_to(larger, DOWN, buff=0.7)
        sums, np_ = split_formula(
            R"10{,}000", R"\times", R"1{,}000", "/", R"\max(800,\, 1{,}000)", "=", R"10{,}000",
            font_size=66,
        )
        np_[6].set_fill(SAGE)
        sums.next_to(given, DOWN, buff=0.45)
        note = words("by the smaller, 12,500: more rows than orders", font_size=42, color=FADED)
        note.next_to(sums, DOWN, buff=0.45)

        self.play(FadeIn(given, shift=0.2 * DOWN), run_time=0.8)
        self.play(
            LaggedStart(*(TransformFromCopy(rp[i], np_[i]) for i in range(5)), lag_ratio=0.2),
            run_time=2,
        )
        self.play(FadeIn(np_[5:], shift=0.2 * LEFT), run_time=0.9)
        self.play(FadeIn(note, shift=0.2 * UP), run_time=0.9)
        self.play(Indicate(np_[6], color=SAGE, scale_factor=1.1))
        self.wait(3)
