"""Clips for /learnings/ibm-model-1."""

from manimlib import *

from style import FADED, INK, SAGE, Clip, formula, words


class SumToProduct(Clip):
    """Every way "the tea" could have written "le thé": nine alignments,
    each 1/9 likely, so P is a ninth of nine products a_i b_k. Each row
    gathers into a_i (b_0 + b_1 + b_2), the rows into one product of two
    sums, and the ninth splits into a third for each: the average chance for
    "le" times the average for "thé". Then the same in general."""

    def construct(self):
        title = words(R"every way ``the tea'' could have written ``le th\'e''", font_size=38, color=FADED)
        title.to_edge(UP, buff=0.5)
        legend = formula(
            R"a_i = t(\text{le} \mid e_i), \quad b_i = t(\text{th\'e} \mid e_i), \quad e_0 = \text{none}",
            font_size=38,
            color=FADED,
        )
        legend.next_to(title, DOWN, buff=0.35)
        self.play(FadeIn(title, shift=0.2 * DOWN))
        self.play(FadeIn(legend))

        # The nine alignments: "le" from e_i, "thé" from e_k
        rows = VGroup(
            *(
                VGroup(*(formula(f"a_{i} b_{k}", font_size=58, t2c={f"a_{i}": SAGE}) for k in range(3))).arrange(RIGHT, buff=1.1)
                for i in range(3)
            )
        ).arrange(DOWN, buff=0.45)
        rows.next_to(legend, DOWN, buff=0.7)
        pluses = VGroup(
            *(
                formula("+", font_size=58, color=FADED).move_to(midpoint(row[k].get_right(), row[k + 1].get_left()))
                for row in rows
                for k in range(2)
            )
        )
        count = words(R"9 alignments, each $\tfrac19$ likely: add all nine", font_size=36, color=FADED)
        count.next_to(rows, DOWN, buff=0.5)
        self.play(LaggedStart(*(FadeIn(term, scale=0.8) for row in rows for term in row), lag_ratio=0.12), run_time=2.2)
        self.play(FadeIn(pluses), FadeIn(count))
        self.wait(1.2)

        # Each row shares its a_i
        gathered = VGroup(
            *(
                formula(f"a_{i}", R"\,(b_0 + b_1 + b_2)", font_size=58, t2c={f"a_{i}": SAGE})
                for i in range(3)
            )
        ).arrange(DOWN, buff=0.45)
        gathered.move_to(rows)
        self.play(
            *(FadeTransform(VGroup(rows[i], pluses[2 * i : 2 * i + 2]), gathered[i]) for i in range(3)),
            run_time=1.8,
        )
        self.wait(0.8)

        # And the rows share the bracket
        product = formula(R"(a_0 + a_1 + a_2)\,(b_0 + b_1 + b_2)", font_size=60, t2c={"a_0 + a_1 + a_2": SAGE})
        product.move_to(gathered)
        fewer = words(R"9 products become 2 sums of 3", font_size=36, color=FADED).move_to(count)
        self.play(FadeTransform(gathered, product), FadeTransform(count, fewer), run_time=1.8)
        self.wait(1)

        # The ninth splits into a third for each French word: two averages
        averages = formula(
            R"P = \frac{a_0 + a_1 + a_2}{3} \times \frac{b_0 + b_1 + b_2}{3}",
            font_size=60,
            t2c={R"\frac{a_0 + a_1 + a_2}{3}": SAGE},
        )
        averages.move_to(product)
        said = words(R"the average chance for ``le'' $\times$ the average for ``th\'e''", font_size=36, color=INK)
        said.move_to(fewer)
        self.play(FadeTransform(product, averages), FadeTransform(fewer, said), run_time=1.8)
        self.wait(1.4)

        # The same for any pair of sentences
        general = formula(
            R"P(\mathbf{f} \mid \mathbf{e}) = \prod_{j=1}^{m} \frac{1}{n+1} \sum_{i=0}^{n} t(f_j \mid e_i)",
            font_size=58,
            t2c={R"\frac{1}{n+1} \sum_{i=0}^{n} t(f_j \mid e_i)": SAGE},
        )
        # Room for it: the legend has done its work
        self.play(FadeOut(title), FadeOut(legend), VGroup(averages, said).animate.to_edge(UP, buff=1.0), run_time=0.8)
        general.next_to(said, DOWN, buff=0.8)
        self.play(Write(general), run_time=2)
        self.play(VGroup(averages, said, general).animate.center(), run_time=0.8)
        self.wait(3)
