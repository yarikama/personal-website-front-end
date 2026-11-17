"""Clips for /learnings/join-algorithms."""

from manimlib import *

from style import FADED, SAGE, Clip, split_formula, split_words, words


class ThreeTrips(Clip):
    """Two bills for the same join, R of 1,000 pages and S of 500 with 101
    pages of memory. Block nested loop: S once, plus R once for each chunk
    of M - 1 pages of S, 500 + 5 x 1,000 = 5,500. Grace hash join: read
    both, write both, read both, 3 x 1,500 = 4,500."""

    def construct(self):
        # Block nested loop, in words, then symbols, then numbers
        name = words("Block nested loop", font_size=40, color=FADED)
        said, sp = split_words("S once", "+", "one trip through R per chunk of S", font_size=38, color=FADED)
        nested, np_ = split_formula("B(S)", "+", R"\frac{B(S)}{M-1}", R"\times", "B(R)", font_size=60)
        VGroup(name, said, nested).arrange(DOWN, buff=0.5).center()

        self.play(FadeIn(name, shift=0.2 * DOWN), run_time=0.8)
        self.play(Write(said), run_time=1.6)
        self.play(
            FadeTransform(sp[0].copy(), np_[0]),
            FadeTransform(sp[1].copy(), np_[1]),
            FadeTransform(sp[2].copy(), np_[2:]),
            run_time=1.6,
        )
        self.wait(0.6)

        # With the course's numbers
        sums, mp = split_formula("500", "+", "5", R"\times", "1{,}000", "=", "5{,}500", font_size=60)
        sums.move_to(nested)
        self.play(FadeOut(said), run_time=0.5)
        self.play(
            ReplacementTransform(np_[0], mp[0]),
            ReplacementTransform(np_[1], mp[1]),
            ReplacementTransform(np_[2], mp[2]),
            ReplacementTransform(np_[3], mp[3]),
            ReplacementTransform(np_[4], mp[4]),
            run_time=1.4,
        )
        self.play(FadeIn(mp[5:], shift=0.2 * LEFT), run_time=0.8)
        note = words(R"$B(R) = 1{,}000$, $B(S) = 500$, $M = 101$", font_size=36, color=FADED)
        note.next_to(sums, DOWN, buff=0.35)
        self.play(FadeIn(note), run_time=0.8)
        self.wait(1)

        # Gather the nested loop at the top
        top = VGroup(name, sums)
        self.play(FadeOut(note), top.animate.arrange(DOWN, buff=0.3).to_edge(UP, buff=0.9), run_time=1)

        # Grace hash join: three trips over both tables
        grace_name = words("Grace hash join", font_size=40, color=FADED)
        trips, tp = split_words("read both", "+", "write both", "+", "read both", font_size=38, color=FADED)
        grace_name.next_to(top, DOWN, buff=0.9)
        trips.next_to(grace_name, DOWN, buff=0.45)
        self.play(FadeIn(grace_name, shift=0.2 * DOWN), run_time=0.8)
        self.play(LaggedStart(*(FadeIn(piece, shift=0.15 * DOWN) for piece in tp), lag_ratio=0.35), run_time=1.8)
        self.wait(0.4)

        grace, gp = split_formula("3", "(", "B(R)", "+", "B(S)", ")", font_size=60)
        grace.next_to(trips, DOWN, buff=0.45)
        self.play(
            FadeTransform(tp.copy(), gp[0]),
            FadeIn(gp[1:], shift=0.2 * UP),
            run_time=1.4,
        )
        self.wait(0.6)

        bill, bp = split_formula("3", R"\times", "1{,}500", "=", "4{,}500", font_size=60)
        bill.move_to(grace)
        bp[4].set_fill(SAGE)
        self.play(FadeOut(trips), run_time=0.5)
        self.play(
            ReplacementTransform(gp[0], bp[0]),
            FadeIn(bp[1]),
            ReplacementTransform(gp[1:], bp[2]),
            run_time=1.4,
        )
        self.play(FadeIn(bp[3:], shift=0.2 * LEFT), run_time=0.8)
        below = VGroup(grace_name, bill)
        self.play(below.animate.arrange(DOWN, buff=0.3).next_to(top, DOWN, buff=0.9), run_time=0.8)

        # What grows and what doesn't, then the whole held in the middle
        moral = words("chunks grow with $B(S)/M$; partitioning stays at 3 trips", font_size=40, color=SAGE)
        moral.next_to(below, DOWN, buff=0.8)
        self.play(FadeIn(moral, shift=0.2 * UP), run_time=1)
        self.play(VGroup(top, below, moral).animate.center(), run_time=0.8)
        self.play(Indicate(bp[4], color=SAGE, scale_factor=1.12))
        self.wait(3)
