"""Clips for /learnings/q-learning."""

from manimlib import *

from style import FADED, INK, SAGE, Clip, formula, split_formula, split_words, words


class MaxTarget(Clip):
    """Sarsa's target, the way you take next, becomes Q-learning's, the
    best way next. Then the numbers on the river's edge."""

    def construct(self):
        title = words("Sarsa: the way you take next", font_size=38, color=FADED).to_edge(UP, buff=0.6)
        pieces = ("Q(s,a)", R"\leftarrow", "Q(s,a)", "+", R"\alpha", R"\big[", "r", "+", R"\gamma")
        tail = ("-", "Q(s,a)", R"\big]")
        sarsa, sp = split_formula(*pieces, "Q(s',a')", *tail, font_size=56, t2c={"Q(s',a')": SAGE, R"\alpha": FADED, R"\gamma": FADED})
        sarsa.next_to(title, DOWN, buff=0.55)
        self.play(FadeIn(title, shift=0.2 * DOWN))
        self.play(Write(sarsa), run_time=2.2)
        self.play(FlashAround(sp[9], color=SAGE, stroke_width=3))
        self.wait(0.8)

        q_title = words("Q-learning: the best way next", font_size=38, color=FADED).move_to(title)
        q, qp = split_formula(*pieces, R"\max_{a} Q(s',a)", *tail, font_size=56, t2c={R"\max_{a} Q(s',a)": SAGE, R"\alpha": FADED, R"\gamma": FADED})
        q.move_to(sarsa)
        self.play(
            FadeTransform(title, q_title),
            *(ReplacementTransform(sp[i], qp[i]) for i in range(len(sp)) if i != 9),
            FadeTransform(sp[9], qp[9]),
            run_time=2,
        )
        self.play(FlashAround(qp[9], color=SAGE, stroke_width=3))
        self.wait(1)

        # On the edge: the next corner's four ways
        ways = words(R"next corner: east $-5$, north $-7$, west $-7$, river $-100$", font_size=36, color=INK)
        ways.next_to(q, DOWN, buff=0.8)
        self.play(FadeIn(ways, shift=0.2 * UP))
        self.wait(0.8)

        took, tp = split_words("Sarsa, you go east:", R"$-1 + (-5) = -6$", font_size=36, color=FADED)
        slip, slp = split_words("Sarsa, you slip in:", R"$-1 + (-100) = -101$", font_size=36, color=FADED)
        best, bp = split_words("Q-learning, either way:", R"$-1 + \max = -6$", font_size=36, color=SAGE)
        lines = VGroup(took, slip, best).arrange(DOWN, aligned_edge=LEFT, buff=0.3).next_to(ways, DOWN, buff=0.5)
        self.play(FadeIn(took, shift=0.15 * UP))
        self.play(FadeIn(slip, shift=0.15 * UP))
        self.wait(0.6)
        self.play(FadeIn(best, shift=0.15 * UP))
        self.play(Indicate(bp[1], color=SAGE, scale_factor=1.1))
        self.wait(4)
