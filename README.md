# PopularGHBranchNamesVisualizer [![Website](https://img.shields.io/website?url=https%3A%2F%2Fstatinsight.github.io%2FPopularGHBranchNamesVisualizer%2F)](https://statinsight.github.io/PopularGHBranchNamesVisualizer/)
Visualizes the data of [statinsight/PopularGHBranchNames](https://github.com/statinsight/PopularGHBranchNames)

## Fine Tuning
| Queryparameter | Description | Default value | Possible values |
| --- | --- | --- | --- |
| ``start`` | Sets the start date into the config | current date - 1 year | A date before the ``end``-date<br/>Example: ``2021-01-01`` |
| ``end`` | Sets the end date into the config | current date | A date after the ``start``-date<br/>Example: ``2022-01-01`` |
| ``step`` | Sets the daysPerStep into the config | ``7`` | A positive integer<br/>Example: ``2`` |
| ``searchnow``<br>``exec`` | Executes the search when the page is loaded | - | - |
| ``hideconfig``<br>``fullscreen`` | Hides the config / Fullscreen mode | - | - |
| ``theme`` | Overrides the theming | Depends on browser setting | ``light``,``dark`` |
| ``scheme``<br>``colorscheme`` | Set's the scheme | ``tol-rainbow`` | See the [palette.js docs](https://github.com/google/palette.js/blob/79a703df344e3b24380ce1a211a2df7f2d90ca22/palette.js#L534-L594) <br/> or run ``palette.listSchemes('all').map(x => x.scheme_name)`` in the browser console | 
