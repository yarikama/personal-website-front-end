"""Clips for /learnings/contextual-bandits."""

from manimlib import *

from style import FADED, SAGE, Clip, split_formula, words

HALF = R"\tfrac{1}{2}"
# An arrow set apart as a piece of its own keeps its spacing this way
ARROW = R"\mskip\thickmuskip\to\mskip\thickmuskip"


class LookFirst(Clip):
    """Bike or train to work, half the mornings wet. Never looking at the
    sky, each route's score is its average over both skies, and the best of
    those is 70%. Looking first, take each sky's best route, then average:
    85%. The best of the averages against the average of the bests."""

    def construct(self):
        # Everything laid out first, so the whole can sit in the middle
        blind_title = words("never look: each route over both skies", font_size=36, color=FADED)
        bike, bike_pieces = split_formula(
            R"\text{bike}", "=", HALF, R"\cdot", R"90\%", "+", HALF, R"\cdot", R"30\%", "=", R"60\%",
            font_size=52,
        )
        train, train_pieces = split_formula(
            R"\text{train}", "=", HALF, R"\cdot", R"60\%", "+", HALF, R"\cdot", R"80\%", "=", R"70\%",
            font_size=52,
        )
        rows = VGroup(bike, train).arrange(DOWN, buff=0.35, aligned_edge=LEFT)
        look_title = words("look first: the best route for each sky", font_size=36, color=FADED)
        skies, sky_pieces = split_formula(
            R"\text{dry}", ARROW, R"\text{bike } 90\%", R"\qquad", R"\text{rain}", ARROW, R"\text{train } 80\%",
            font_size=52,
        )
        both, both_pieces = split_formula(
            HALF, R"\cdot", R"90\%", "+", HALF, R"\cdot", R"80\%", "=", R"85\%",
            font_size=52,
        )
        blind_title.to_edge(UP, buff=0)
        rows.next_to(blind_title, DOWN, buff=0.45)
        look_title.next_to(rows, DOWN, buff=0.8).set_x(blind_title.get_x())
        skies.next_to(look_title, DOWN, buff=0.45)
        both.next_to(skies, DOWN, buff=0.35)
        box = SurroundingRectangle(train_pieces[10], buff=0.08).set_stroke(SAGE, 2)
        blind_best = words("best of the averages", font_size=34, color=SAGE).next_to(box, RIGHT, buff=0.3)
        box2 = SurroundingRectangle(both_pieces[8], buff=0.08).set_stroke(SAGE, 2)
        look_best = words("average of the bests", font_size=34, color=SAGE).next_to(box2, RIGHT, buff=0.3)
        everything = VGroup(blind_title, rows, look_title, skies, both, box, blind_best, box2, look_best)
        everything.center()

        # Never looking: each route averaged over both skies
        self.play(FadeIn(blind_title, shift=0.2 * DOWN))
        for pieces in (bike_pieces, train_pieces):
            self.play(FadeIn(pieces[:2]), run_time=0.6)
            self.play(LaggedStart(*(FadeIn(p, shift=0.15 * RIGHT) for p in pieces[2:9]), lag_ratio=0.12), run_time=1.6)
            self.play(FadeIn(pieces[9:], shift=0.2 * LEFT), run_time=0.7)
        self.wait(0.4)

        # The best of the averages
        train_pieces[10].generate_target().set_fill(SAGE)
        self.play(MoveToTarget(train_pieces[10]), ShowCreation(box), FadeIn(blind_best, shift=0.2 * LEFT))
        self.wait(1)

        # Looking first: each sky's best route, then the average
        self.play(FadeIn(look_title, shift=0.2 * DOWN))
        self.play(FadeTransform(bike_pieces[4].copy(), sky_pieces[2]), FadeIn(sky_pieces[:2]), run_time=1.2)
        self.play(FadeTransform(train_pieces[8].copy(), sky_pieces[6]), FadeIn(sky_pieces[3:6]), run_time=1.2)
        self.play(
            FadeIn(both_pieces[0:2]),
            FadeTransform(sky_pieces[2].copy(), both_pieces[2]),
            FadeIn(both_pieces[3:6]),
            FadeTransform(sky_pieces[6].copy(), both_pieces[6]),
            run_time=1.5,
        )
        self.play(FadeIn(both_pieces[7:], shift=0.2 * LEFT))

        # The average of the bests
        both_pieces[8].generate_target().set_fill(SAGE)
        self.play(MoveToTarget(both_pieces[8]), ShowCreation(box2), FadeIn(look_best, shift=0.2 * LEFT))
        self.play(FlashAround(both_pieces[8], color=SAGE, stroke_width=3))
        self.wait(3)
