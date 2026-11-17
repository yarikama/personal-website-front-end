"""Clips for /learnings/predicate-pushdown."""

from manimlib import *

from style import BG, FADED, INK, RULE, SAGE, Clip, formula, words


def bowtie(color: str, size: float = 0.22) -> VMobject:
    """Garamond's maths has no bowtie, so the join's sign is drawn."""
    w, h = size, size * 0.75
    return Polygon(
        [-w, h, 0], [0, 0, 0], [w, h, 0], [w, -h, 0], [0, 0, 0], [-w, -h, 0],
        stroke_color=color, stroke_width=4, fill_opacity=0,
    )


def box(content: Mobject, color: str = RULE) -> VGroup:
    """A node of the tree: its label on a rounded card that hides the edges
    behind it."""
    card = RoundedRectangle(
        width=content.get_width() + 0.5,
        height=content.get_height() + 0.36,
        corner_radius=0.18,
        fill_color=BG,
        fill_opacity=1,
        stroke_color=color,
        stroke_width=2,
    ).move_to(content)
    return VGroup(card, content)


def selection(clause: str) -> VGroup:
    """A filter node's label: sigma, then its clause in words."""
    sign = formula(R"\sigma", font_size=52, color=SAGE)
    text = words(clause, font_size=38, color=SAGE)
    return VGroup(sign, text).arrange(RIGHT, buff=0.2, aligned_edge=DOWN)


def edge(a: Mobject, b: Mobject) -> Line:
    return Line(a.get_bottom(), b.get_top(), stroke_color=RULE, stroke_width=3)


class PushDown(Clip):
    """The presents' plan: one filter with three clauses over FRIEND x GIFT.
    The filter splits into its clauses; the birthday clause slides onto
    FRIEND, the price clause onto GIFT, and the hobby clause into the
    product, which becomes a join. The product made 48 rows; the join makes
    12, and the answer is the same 3."""

    def construct(self):
        friend = box(words("FRIEND", font_size=38)).move_to([-3.6, -3.0, 0])
        gift = box(words("GIFT", font_size=38)).move_to([3.6, -3.0, 0])
        times = box(formula(R"\times", font_size=60)).move_to([0, 0.5, 0])

        # The filter on top, a clause at a time
        sigma = formula(R"\sigma", font_size=60)
        bday = words("birthday", font_size=38)
        price = words(R"price $<$ 30", font_size=38)
        hobby = words("same hobby", font_size=38)
        ands = [formula(R"\wedge", font_size=48, color=FADED) for _ in range(2)]
        top_row = VGroup(sigma, bday, ands[0], price, ands[1], hobby).arrange(RIGHT, buff=0.25)
        top_row.move_to([0, 2.9, 0])
        top_card = box(top_row)[0]

        down = [edge(top_card, times), edge(times, friend), edge(times, gift)]

        self.play(FadeIn(friend), FadeIn(gift), run_time=0.8)
        self.play(ShowCreation(down[1]), ShowCreation(down[2]), FadeIn(times), run_time=1.0)
        self.play(ShowCreation(down[0]), FadeIn(top_card), Write(top_row), run_time=1.6)

        rows = words("48 rows", font_size=36, color=FADED).next_to(times, RIGHT, buff=0.35)
        self.play(FadeIn(rows, shift=0.1 * LEFT), run_time=0.6)
        self.wait(0.8)

        # Each clause names what it reads
        reads = [
            words("reads FRIEND", font_size=34, color=FADED).next_to(bday, DOWN, buff=0.35),
            words("reads GIFT", font_size=34, color=FADED).next_to(price, DOWN, buff=0.35),
            words("reads both", font_size=34, color=FADED).next_to(hobby, DOWN, buff=0.35),
        ]
        self.play(top_card.animate.set_stroke(opacity=0), FadeOut(down[0]), run_time=0.4)
        self.play(LaggedStart(*(FadeIn(r, shift=0.1 * DOWN) for r in reads), lag_ratio=0.4), run_time=1.6)
        self.wait(0.8)
        self.play(FadeOut(VGroup(*reads)), run_time=0.4)

        # The birthday clause goes onto FRIEND
        bday_node = box(selection("birthday"), SAGE).move_to([-3.6, -1.15, 0])
        left = VGroup(edge(times, bday_node), edge(bday_node, friend))
        self.play(bday.animate.set_fill(SAGE), run_time=0.3)
        self.play(
            ReplacementTransform(down[1], left),
            FadeIn(bday_node[0]),
            FadeTransform(bday, bday_node[1]),
            run_time=1.4,
        )
        self.wait(0.3)

        # The price clause onto GIFT
        price_node = box(selection(R"price $<$ 30"), SAGE).move_to([3.6, -1.15, 0])
        right = VGroup(edge(times, price_node), edge(price_node, gift))
        self.play(price.animate.set_fill(SAGE), run_time=0.3)
        self.play(
            ReplacementTransform(down[2], right),
            FadeIn(price_node[0]),
            FadeTransform(price, price_node[1]),
            run_time=1.4,
        )
        self.wait(0.3)

        # The hobby clause reads both, so it stops at the product: a join
        tie = bowtie(SAGE)
        on = words("same hobby", font_size=34, color=SAGE)
        join_label = VGroup(tie, on).arrange(RIGHT, buff=0.18, aligned_edge=DOWN)
        on.shift(0.12 * DOWN)
        join = box(join_label, SAGE).move_to(times)
        self.play(hobby.animate.set_fill(SAGE), run_time=0.3)
        self.play(
            FadeOut(VGroup(sigma, *ands)),
            FadeTransform(hobby, on),
            ReplacementTransform(times[0], join[0]),
            FadeTransform(times[1], tie),
            rows.animate.next_to(join, RIGHT, buff=0.35),
            run_time=1.6,
        )
        # The new card lands on top; put its label back over it
        self.add(tie, on)
        self.wait(0.4)

        # What each node now makes
        counts = [
            words("3 rows", font_size=34, color=FADED).next_to(bday_node, LEFT, buff=0.3),
            words("4 rows", font_size=34, color=FADED).next_to(price_node, RIGHT, buff=0.3),
        ]
        made = words("12 rows", font_size=36, color=SAGE).move_to(rows, aligned_edge=LEFT)
        was = words("was 48", font_size=30, color=FADED).next_to(made, DOWN, buff=0.15, aligned_edge=LEFT)
        self.play(LaggedStart(*(FadeIn(c) for c in counts), lag_ratio=0.3), run_time=1.0)
        self.play(FadeTransform(rows, made), FadeIn(was, shift=0.1 * UP), run_time=1.2)

        kept = words("the same 3 pairs come out", font_size=36, color=INK).move_to([0, 2.9, 0])
        top_edge = Line(kept.get_bottom() + 0.15 * DOWN, join.get_top(), stroke_color=RULE, stroke_width=3)
        self.play(FadeIn(kept, shift=0.1 * DOWN), ShowCreation(top_edge), run_time=1.0)
        self.wait(3.5)
