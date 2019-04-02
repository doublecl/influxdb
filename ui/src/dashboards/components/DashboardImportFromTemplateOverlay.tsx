// Libraries
import React, {PureComponent} from 'react'
import {withRouter, WithRouterProps} from 'react-router'
import {connect} from 'react-redux'
import _ from 'lodash'

// Components
import {Button, ComponentColor} from '@influxdata/clockface'
import {
  Overlay,
  ResponsiveGridSizer,
  Panel,
  EmptyState,
  ComponentSize,
} from 'src/clockface'
import {
  TemplateSummary,
  ITemplate,
  Organization,
  TemplateType,
  IDashboardTemplateIncluded,
} from '@influxdata/influx'
import CardSelectCard from 'src/clockface/components/card_select/CardSelectCard'
import OrgTemplateFetcher from 'src/organizations/components/OrgTemplateFetcher'

// Actions
import {createDashboardFromTemplate as createDashboardFromTemplateAction} from 'src/dashboards/actions'
import {getTemplateByID} from 'src/templates/actions'

// Types
import {AppState, RemoteDataState, DashboardTemplate} from 'src/types'

interface StateProps {
  templates: TemplateSummary[]
  templateStatus: RemoteDataState
  orgs: Organization[]
}

interface DispatchProps {
  createDashboardFromTemplate: typeof createDashboardFromTemplateAction
}

interface State {
  selectedTemplateSummary: TemplateSummary
  selectedTemplate: ITemplate
  variables: string[]
  cells: string[]
}

class DashboardImportFromTemplateOverlay extends PureComponent<
  StateProps & WithRouterProps & DispatchProps,
  State
> {
  constructor(props) {
    super(props)
    this.state = {
      selectedTemplateSummary: null,
      selectedTemplate: null,
      variables: [],
      cells: [],
    }
  }

  render() {
    const {selectedTemplateSummary} = this.state

    return (
      <Overlay visible={true}>
        <Overlay.Container maxWidth={800}>
          <Overlay.Heading
            title={`Import Dashboard from a Template`}
            onDismiss={this.onDismiss}
          />
          <Overlay.Body>
            <div className="import-template-overlay">
              <OrgTemplateFetcher orgName={this.orgName}>
                <ResponsiveGridSizer columns={3}>
                  {this.templates}
                </ResponsiveGridSizer>
              </OrgTemplateFetcher>
              {!selectedTemplateSummary && (
                <Panel className="import-template-overlay--empty">
                  <Panel.Body>
                    <EmptyState size={ComponentSize.Medium}>
                      <EmptyState.Text text="Select a Template on the left" />
                    </EmptyState>
                  </Panel.Body>
                </Panel>
              )}
              {selectedTemplateSummary && (
                <Panel className="import-template-overlay--details">
                  <Panel.Header
                    title={_.get(selectedTemplateSummary, 'meta.name')}
                  />
                  <Panel.Body>
                    {/* TODO: Add Template description */}
                    <div className="import-template-overlay--columns">
                      <div className="import-template-overlay--variables-column">
                        <h5>Variables:</h5>
                        {this.state.variables.map(v => {
                          return <p key={v}>{v}</p>
                        })}
                      </div>
                      <div className="import-template-overlay--cells-column">
                        <h5>Cells:</h5>
                        {this.state.cells.map(c => {
                          return <p key={c}>{c}</p>
                        })}
                      </div>
                    </div>
                  </Panel.Body>
                </Panel>
              )}
            </div>
          </Overlay.Body>
          <Overlay.Footer>{this.buttons}</Overlay.Footer>
        </Overlay.Container>
      </Overlay>
    )
  }

  private get templates(): JSX.Element[] {
    const {templates} = this.props
    const {selectedTemplateSummary} = this.state

    return templates.map(t => {
      return (
        <CardSelectCard
          key={t.id}
          id={t.id}
          onClick={this.selectTemplate(t)}
          checked={_.get(selectedTemplateSummary, 'id', '') === t.id}
          label={t.meta.name}
          hideImage={true}
        />
      )
    })
  }

  private get buttons(): JSX.Element[] {
    return [
      <Button text="Cancel" onClick={this.onDismiss} key="cancel-button" />,
      <Button
        text="Create Dashboard"
        onClick={this.onSubmit}
        key="submit-button"
        color={ComponentColor.Primary}
      />,
    ]
  }

  private get orgName(): string {
    const {
      params: {orgID},
      orgs,
    } = this.props
    return orgs.find(org => {
      return org.id === orgID
    }).name
  }

  private getVariablesForTemplate(template: ITemplate): string[] {
    const variables = []
    const included = template.content.included as IDashboardTemplateIncluded[]
    included.forEach(data => {
      if (data.type === TemplateType.Variable) {
        variables.push(data.attributes.name)
      }
    })

    return variables
  }

  private getCellsForTemplate(template: ITemplate): string[] {
    const cells = []
    const included = template.content.included as IDashboardTemplateIncluded[]
    included.forEach(data => {
      if (data.type === TemplateType.View) {
        cells.push(data.attributes.name)
      }
    })

    return cells
  }

  private selectTemplate = (
    selectedTemplateSummary: TemplateSummary
  ) => async (): Promise<void> => {
    this.setState({selectedTemplateSummary})
    const selectedTemplate = await getTemplateByID(selectedTemplateSummary.id)
    this.setState({
      selectedTemplate,
      variables: this.getVariablesForTemplate(selectedTemplate),
      cells: this.getCellsForTemplate(selectedTemplate),
    })
  }

  private onDismiss = () => {
    const {router} = this.props
    router.goBack()
  }

  private onSubmit = async (): Promise<void> => {
    const {
      createDashboardFromTemplate,
      params: {orgID},
    } = this.props

    await createDashboardFromTemplate(
      this.state.selectedTemplate as DashboardTemplate,
      orgID
    )
    this.onDismiss()
  }
}

const mstp = ({templates: {items, status}, orgs}: AppState): StateProps => ({
  templates: items,
  templateStatus: status,
  orgs: orgs.items,
})

const mdtp: DispatchProps = {
  createDashboardFromTemplate: createDashboardFromTemplateAction,
}

export default connect<StateProps>(
  mstp,
  mdtp
)(withRouter(DashboardImportFromTemplateOverlay))
