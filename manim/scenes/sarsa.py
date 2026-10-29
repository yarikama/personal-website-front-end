"""Clips for /learnings/sarsa."""

from manimlib import *

from style import FADED, INK, SAGE, Clip, formula, split_formula, words


class SarsaUpdate(Clip):
    """The TD rule for a place becomes a rule for a place and a way out of
    it; the five things the update uses then spell the method's name."""

    def construct(self):
        place = words("a score for each place", font_size=38, color=FADED).to_edge(UP, buff=0.7)
        td, tp = split_formula(
            "V(s)", R"\leftarrow", "V(s)", "+", R"\alpha", R"\big[", "r", "+", R"\gamma", "V(s')", "-", "V(s)", R"\big]",
            font_size=60,
            t2c={"V(s')": SAGE, R"\alpha": FADED, R"\gamma": FADED},
        )
        td.next_to(place, DOWN, buff=0.6)
        self.play(FadeIn(place, shift=0.2 * DOWN))
        self.play(Write(td), run_time=2.2)
        self.wait(1)

        way = words("a score for each way out of each place", font_size=38, color=FADED).move_to(place)
        q, qp = split_formula(
            "Q(s,a)", R"\leftarrow", "Q(s,a)", "+", R"\alpha", R"\big[", "r", "+", R"\gamma", "Q(s',a')", "-", "Q(s,a)", R"\big]",
            font_size=60,
            t2c={"Q(s',a')": SAGE, R"\alpha": FADED, R"\gamma": FADED},
        )
        q.move_to(td)
        self.play(
            FadeTransform(place, way),
            *(FadeTransform(tp[i], qp[i]) for i in range(len(tp))),
            run_time=2.2,
        )
        self.wait(0.8)

        # The way you really take next
        brace = Brace(qp[9], DOWN, buff=0.15).set_fill(SAGE)
        next_way = words("the way you take next", font_size=36, color=SAGE).next_to(brace, DOWN, buff=0.15)
        self.play(GrowFromCenter(brace), FadeIn(next_way, shift=0.2 * DOWN))
        self.wait(1.5)
        self.play(FadeOut(brace), FadeOut(next_way))

        # The five things it uses
        row, rp = split_formula("s", R",\quad", "a", R",\quad", "r", R",\quad", "s'", R",\quad", "a'", font_size=72)
        row.next_to(q, DOWN, buff=1.1)
        self.play(
            LaggedStart(
                TransformFromCopy(qp[0], rp[0]),
                TransformFromCopy(qp[0], rp[2]),
                TransformFromCopy(qp[6], rp[4]),
                TransformFromCopy(qp[9], rp[6]),
                TransformFromCopy(qp[9], rp[8]),
                lag_ratio=0.3,
            ),
            FadeIn(VGroup(rp[1], rp[3], rp[5], rp[7])),
            run_time=3,
        )
        named = words("state, action, reward, next state, next action", font_size=34, color=FADED)
        named.next_to(row, DOWN, buff=0.35)
        self.play(FadeIn(named, shift=0.15 * UP))
        self.wait(1.2)

        name = words("Sarsa", font_size=80, color=SAGE).move_to(row)
        self.play(FadeTransform(row, name), run_time=1.4)
        self.wait(4)
