"""Clips for /learnings/upper-confidence-bound."""

from manimlib import *

from style import FADED, INK, SAGE, Clip, formula, split_formula, split_words, words


class UcbScore(Clip):
    """The rule built from words: how good it looks plus how unsure you
    still are, turned into Q(a) + c sqrt(ln t / N(a)). Then, with c = 1,
    what visits do to the doubt (divide it) and what time does (creep it up)."""

    def construct(self):
        title = words("go wherever this is highest:", font_size=40, color=FADED)
        title.to_edge(UP, buff=0.5)
        said, sp = split_words("how good it looks", "+", "how unsure you still are", font_size=54)
        said.next_to(title, DOWN, buff=0.7)
        self.play(FadeIn(title, shift=0.2 * DOWN))
        self.play(Write(said), run_time=2)
        self.wait(0.6)

        # Each phrase becomes its symbols; the doubt hides two things to watch
        rule, rp = split_formula(
            "Q(a)", "+", "c", R"\sqrt{\frac{\ln t}{N(a)}}",
            font_size=76,
            t2c={"N(a)": INK, R"\ln t": INK},
        )
        rule.next_to(said, DOWN, buff=0.8)
        self.play(
            FadeTransform(sp[0].copy(), rp[0]),
            FadeTransform(sp[1].copy(), rp[1]),
            FadeTransform(sp[2].copy(), rp[2:]),
            run_time=2,
        )
        self.wait(0.6)

        # Name the two halves under the formula, then let the words go
        good = Brace(rp[0], DOWN, buff=0.15).set_fill(FADED)
        unsure = Brace(rp[2:], DOWN, buff=0.15).set_fill(SAGE)
        good_label = words("the score", font_size=34, color=FADED).next_to(good, DOWN, buff=0.15)
        unsure_label = words("the doubt", font_size=34, color=SAGE).next_to(unsure, DOWN, buff=0.15)
        self.play(GrowFromCenter(good), GrowFromCenter(unsure), FadeIn(good_label), FadeIn(unsure_label))
        self.wait(1.2)
        self.play(
            FadeOut(VGroup(title, said), shift=0.4 * UP),
            FadeOut(VGroup(good, unsure, good_label, unsure_label)),
            rule.animate.to_edge(UP, buff=0.5),
            run_time=1.2,
        )

        n_part = rule.select_part("N(a)")
        t_part = rule.select_part(R"\ln t")

        def row(label, sub, cells, y):
            """A row of worked doubts: a label, then each case with its value
            and a bar as long as the value."""
            name = words(label, font_size=40).move_to([-5.0, y + 0.25, 0])
            note = words(sub, font_size=34, color=FADED).next_to(name, DOWN, buff=0.12)
            parts = []
            for i, (case, value) in enumerate(cells):
                left = -2.9 + i * 3.4
                top = formula(case, font_size=44).move_to([left, y + 0.55, 0], aligned_edge=LEFT)
                bar = Rectangle(width=value * 0.85, height=0.22, fill_color=SAGE, fill_opacity=1, stroke_width=0)
                bar.move_to([left, y - 0.05, 0], aligned_edge=LEFT)
                number = formula(f"{value:.2f}", font_size=44, color=SAGE).move_to([left, y - 0.55, 0], aligned_edge=LEFT)
                parts.append((top, bar, number))
            return VGroup(name, note), parts

        def play_row(head, parts, source):
            self.play(source.animate.set_fill(SAGE), FlashAround(source, color=SAGE, stroke_width=3), FadeIn(head))
            for top, bar, number in parts:
                self.play(
                    FadeTransform(source.copy(), top),
                    GrowFromEdge(bar, LEFT),
                    FadeIn(number, shift=0.1 * DOWN),
                    run_time=0.9,
                )
            self.play(source.animate.set_fill(INK), run_time=0.4)

        # Worked with c = 1. More visits divide the doubt
        c_note = words(R"with $c = 1$", font_size=36, color=FADED).next_to(rule, RIGHT, buff=0.6)
        self.play(FadeIn(c_note))
        head, parts = row(
            "more visits", R"at lunch $t = 10$",
            [("N = 1", 1.52), ("N = 4", 0.76), ("N = 16", 0.38)], 0.35,
        )
        play_row(head, parts, n_part)
        self.wait(1)

        # More time grows it, slowly
        head2, parts2 = row(
            "more lunches", R"tried once, $N = 1$",
            [("t = 10", 1.52), ("t = 100", 2.15), ("t = 1000", 2.63)], -2.35,
        )
        play_row(head2, parts2, t_part)
        self.wait(3.5)
