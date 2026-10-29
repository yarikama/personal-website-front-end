"""Clips for /learnings/monte-carlo-prediction."""

from manimlib import *

from style import FADED, INK, RULE, SAGE, Clip, formula, split_formula, words


class ReturnsFromTheEnd(Clip):
    """A game of six turns as a row of squares, each waiting for its number.
    Only at the finish can the turns left be counted, from the end backward.
    Then each square moves its average toward its count: the update, with
    the start square's numbers dropped in."""

    def construct(self):
        title = words("one game, square by square", font_size=36, color=FADED).to_edge(UP, buff=0.6)

        names = ["1", "7", "13", "7", "12", "18"]
        boxes = VGroup(*(Square(side_length=1.0, stroke_color=RULE, stroke_width=3) for _ in names))
        finish = Square(side_length=1.0, stroke_color=INK, stroke_width=3)
        row = VGroup(*boxes, finish).arrange(RIGHT, buff=0.55).move_to(UP * 1.2)
        labels = VGroup(
            *(formula(name, font_size=40).move_to(box) for name, box in zip(names, boxes)),
        )
        flag = words("end", font_size=34).move_to(finish)
        arrows = VGroup(
            *(
                Arrow(row[i].get_right(), row[i + 1].get_left(), buff=0.08, stroke_color=RULE, stroke_width=3)
                for i in range(len(row) - 1)
            )
        )
        marks = VGroup(*(formula("?", font_size=44, color=FADED).next_to(box, UP, buff=0.3) for box in boxes))

        self.play(FadeIn(title))
        self.play(
            LaggedStart(*(AnimationGroup(ShowCreation(b), FadeIn(l)) for b, l in zip(boxes, labels)), lag_ratio=0.15),
            run_time=2,
        )
        self.play(LaggedStart(*(GrowArrow(a) for a in arrows), lag_ratio=0.1), ShowCreation(finish), FadeIn(flag))
        self.play(LaggedStart(*(FadeIn(m, shift=0.1 * DOWN) for m in marks), lag_ratio=0.08))
        self.wait(0.6)

        # At the finish, count back: each square's turns left is one more
        # than the next square's
        back = words("at the end, count back", font_size=36, color=SAGE).move_to(title)
        self.play(FadeTransform(title, back))
        counts = [formula(str(len(names) - i), font_size=48, color=SAGE).move_to(marks[i]) for i in range(len(names))]
        for i in reversed(range(len(names))):
            self.play(FadeTransform(marks[i], counts[i]), run_time=0.45)
        self.wait(0.4)
        twice = VGroup(
            *(SurroundingRectangle(counts[i], buff=0.12, stroke_color=FADED, stroke_width=2) for i in (1, 3))
        )
        note = words("square 7, twice: 5 and 3", font_size=32, color=FADED).next_to(row, DOWN, buff=0.35)
        self.play(ShowCreation(twice), FadeIn(note))
        self.wait(1)

        # The update: each square's average moves toward its own count
        rule, rp = split_formula(
            "V(s)", R"\leftarrow", "V(s)", "+", R"\alpha", R"\big[", "G", "-", "V(s)", R"\big]",
            font_size=60,
            t2c={"G": SAGE, R"\alpha": FADED},
        )
        rule.move_to(DOWN * 1.2)
        self.play(FadeOut(twice), FadeOut(note), Write(rule), run_time=1.8)
        brace = Brace(rp[6], DOWN, buff=0.15).set_fill(SAGE)
        said = words("the count that followed", font_size=34, color=SAGE).next_to(brace, DOWN, buff=0.15)
        self.play(GrowFromCenter(brace), FadeIn(said, shift=0.2 * DOWN))
        self.wait(1.2)

        # The start square, in its second game: 6 so far, 5 this time
        sums, sp = split_formula(
            "6", "+", R"\tfrac{1}{2}", R"\times", "(", "5", "-", "6", ")", "=", "5.5",
            font_size=60,
            t2c={"5": SAGE, R"\tfrac{1}{2}": FADED},
        )
        sums.move_to(DOWN * 2.9)
        self.play(FadeOut(brace), FadeOut(said))
        self.play(
            LaggedStart(
                TransformFromCopy(rp[2], sp[0]),
                FadeIn(sp[1]),
                TransformFromCopy(rp[4], sp[2]),
                FadeIn(sp[3:5]),
                TransformFromCopy(rp[6], sp[5]),
                FadeIn(sp[6]),
                TransformFromCopy(rp[8], sp[7]),
                FadeIn(sp[8]),
                lag_ratio=0.2,
            ),
            run_time=2.5,
        )
        self.play(FadeIn(sp[9:], shift=0.2 * LEFT))
        self.play(Indicate(sp[10], color=INK, scale_factor=1.15))
        self.wait(2.5)
