import React from 'react'

import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Form from 'react-bootstrap/Form'
import Table from 'react-bootstrap/Table'
import Button from 'react-bootstrap/Button'
import Alert from 'react-bootstrap/Alert'
import Navbar from 'react-bootstrap/Navbar'

import DatePicker from 'react-datepicker'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'

import moment from 'moment'

import 'whatwg-fetch'

import 'react-datepicker/dist/react-datepicker.css'

export default class App extends React.Component {

  constructor() {
    super()
    this.state = {
      step: 0,
      apiKey: null,
      kronosEmail: '',
      kronosPassword: '',
      month: null,
      datas: [],
      sums: {
        proj: 0,
        acc: 0,
        playlist: 0,
        projreg: 0
      },
      loadingConnect: false,
      loadingWorks: false,
      connectError: null,
      fetchError: null
    }
  }

  emailChange(event){
    this.setState({...this.state, kronosEmail: event.target.value})
  }
  passwordChange(event){
    this.setState({...this.state, kronosPassword: event.target.value})
  }

  getApiKey() {
    this.setState({
      ...this.state,
      loadingConnect: true,
      connectError: null
    }, () => 
      fetch('https://api-kronos.ticketack.com/kuser/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Referer': 'https://kronos.ticketack.com/'
        },
        body: JSON.stringify({
          email: this.state.kronosEmail,
          password: this.state.kronosPassword
        })
      }).then(response => response.json())
        .then(data => {
          if(data.flash.error){
            this.setState({
              ...this.state,
              connectError: data.flash.error
            })
          } else {
            this.setState({
              ...this.state,
              step: 1,
              apiKey: data.user.api_key
            })
          }
        })
        .finally(() => {
          this.setState({
            ...this.state,
            loadingConnect: false
          })
        })
    )
  }

  handleChangeMonth(month) {
    this.setState({
      ...this.state,
      month
    })
  }

  fetchTasks () {
    const startDate = moment(this.state.month)
    const endDate = moment(this.state.month).endOf('month')
    this.setState({
      ...this.state,
      loadingWorks: true,
      fetchError: null
    }, () => 
      fetch(`https://api-kronos.ticketack.com/task/list?start_at_gte=${startDate.format("YY-MM-DDTHH:mm:ssZ").replace('+', '%2B')}&start_at_lte=${endDate.format("YYYY-MM-DDTHH:mm:ssZ").replace('+', '%2B')}`, {
        headers: {
          'Content-Type': 'application/json',
          'Referer': 'https://kronos.ticketack.com/',
          'X-API-Key': this.state.apiKey
        }
      }).then(response => response.json())
        .then(data => {
          if(data.flash.error){
            this.setState({
              ...this.state,
              fetchError: data.flash.error
            })
          } else {
            const { tasks } = data
            const volunteers = new Set()
            tasks.forEach(task => {
              if(task.user)
                volunteers.add(`${task.user.firstname} ${task.user.lastname}`)
            })

            const datas = []
            const sums = {
              proj: 0,
              acc: 0,
              playlist: 0,
              projreg: 0
            }

            volunteers.forEach(volunteer => {
              const [firstname, ...lastname] = volunteer.split(' ')
              const works = {
                proj: 0,
                acc: 0,
                playlist: 0,
                projreg: 0
              }
              tasks.forEach(task => {
                if(task.user && task.user.firstname === firstname && task.user.lastname === lastname.join(' ')){
                  if(task.activity.name.fr === 'Accueil/billetterie'){
                    works.acc++
                    sums.acc++
                  }
                  if(task.activity.name.fr === 'Projectionniste'){
                    works.proj++
                    sums.proj++
                  }
                  if(task.activity.name.fr === 'Projectionniste-régisseur'){
                    works.projreg++
                    sums.projreg++
                  }
                  if(task.activity.name.fr === 'Playlister'){
                    works.playlist += 3
                    sums.playlist += 3
                  }
                }
              })

              datas.push({
                volunteer,
                proj: works.proj,
                acc: works.acc,
                projreg: works.projreg,
                playlist: works.playlist
              })
            })
            this.setState({
              ...this.state,
              step: 2,
              datas,
              sums
            })
          }
        })
        .finally(() => this.setState({
          ...this.state,
          loadingWorks: false
        }))
    )
  }

  convertArrayOfObjectsToCSV(args) {  
    const data = args.data || null;
    if (data == null || !data.length) {
        return null
    }

    const columnDelimiter = args.columnDelimiter || ','
    const lineDelimiter = args.lineDelimiter || '\n'

    const keys = Object.keys(data[0])

    let result = ''
    result += keys.join(columnDelimiter)
    result += lineDelimiter

    data.forEach(function(item) {
        let ctr = 0
        keys.forEach(function(key) {
            if (ctr > 0) result += columnDelimiter

            result += item[key]
            ctr++
        });
        result += lineDelimiter
    })

    return result
  }

  downloadCSV(arg) {  
    let csv = this.convertArrayOfObjectsToCSV({ data: arg })
    if (csv == null) return

    const filename = 'volunteer-data.csv'

    if (!csv.match(/^data:text\/csv/i)) {
        csv = 'data:text/csv;charset=utf-8,' + csv
    }
    const data = encodeURI(csv)

    const link = document.createElement('a')
    link.setAttribute('href', data)
    link.setAttribute('download', filename)
    link.click()
  }

  render() {
    return (
      <div>
        <Navbar bg='dark' variant='dark'>
          <Navbar.Brand href="#home">Kronos Volunteer Fetcher</Navbar.Brand>
          <Navbar.Toggle />
          <Navbar.Collapse className='justify-content-end'>
            <Navbar.Text>
              Cinémajoie
            </Navbar.Text>
          </Navbar.Collapse>
        </Navbar>
        <Container className='mt-4'>
          <Row>
            <Col>
              {
                this.state.step >= 0 && (
                  <div>
                    <Row>
                      <h3>1. Récupérer la clé d'API</h3>
                    </Row>
                    <Row>
                      {
                        this.state.connectError != null && (
                          <Alert variant='danger'>
                            {this.state.connectError}
                          </Alert>
                        )
                      }
                      <Form>
                        <Form.Group controlId='kronos-connect-email'>
                          <Form.Label>Adresse email Kronos</Form.Label>
                          <Form.Control type='email' onChange={this.emailChange.bind(this)} />
                        </Form.Group>

                        <Form.Group controlId='kronos-connect-password'>
                          <Form.Label>Mot de passe Kronos</Form.Label>
                          <Form.Control type='password' onChange={this.passwordChange.bind(this)} />
                        </Form.Group>
                        <Button variant='primary' onClick={this.getApiKey.bind(this)} disabled={this.state.loadingConnect}>
                          {
                            this.state.loadingConnect ? (<FontAwesomeIcon icon={faSpinner} spin />) : ('Se connecter')
                          }
                        </Button>
                      </Form>
                    </Row>
                  </div>
                )
              }
            </Col>
            <Col>
              {
                this.state.step >= 1 && (
                  <div>
                    <Row>
                      <h3>2. Sélection du mois</h3>
                    </Row>
                    <Row>
                      {
                        this.state.fetchError != null && (
                          <Alert variant='danger'>
                            {this.state.fetchError}
                          </Alert>
                        )
                      }
                      <Form>
                        <Form.Group controlId='fetch-date-start'>
                          <Form.Label>Sélectionner le mois</Form.Label><br />
                          <DatePicker
                            selected={this.state.month}
                            dateFormat="MM/yyyy"
                            showMonthYearPicker
                            onChange={this.handleChangeMonth.bind(this)}
                          />
                        </Form.Group>
                        <Button variant='primary' onClick={this.fetchTasks.bind(this)} disabled={this.state.loadingWorks}>
                          {
                            this.state.loadingWorks ? (<FontAwesomeIcon icon={faSpinner} spin />) : ('Récupérer les bénévoles')
                          }
                        </Button>
                      </Form>
                    </Row>
                  </div>
                )
              }
            </Col>
          </Row>
          {
            this.state.step >= 2 && (
              <div className='mt-4'>
                <Row>
                  <h3>3. Affichage des données <Button onClick={() => this.downloadCSV(this.state.datas)}>Exporter en CSV</Button></h3>
                </Row>
                <Row>
                  <Table striped bordered hover>
                    <thead>
                      <tr>
                        <th>Bénévole</th>
                        <th>Accueil/billetterie</th>
                        <th>Projection</th>
                        <th>Projection - Régie</th>
                        <th>Playlist</th>
                        <th>Billets</th>
                      </tr>
                    </thead>
                    <tbody>
                      {
                        this.state.datas.length > 0 && this.state.datas.map(data => (
                          <tr>
                            <td>{data.volunteer}</td>
                            <td>{data.acc > 0 ? data.acc : '-'}</td>
                            <td>{data.proj > 0 ? data.proj : '-'}</td>
                            <td>{data.projreg > 0 ? data.projreg : '-'}</td>
                            <td>{data.playlist > 0 ? data.playlist : '-'}</td>
                            <td>{data.acc + data.proj + data.projreg + data.playlist}</td>
                          </tr>
                        ))
                      }
                    </tbody>
                    <tfoot>
                      <tr>
                        <td><b>Totaux</b></td>
                        <td>{this.state.sums.acc}</td>
                        <td>{this.state.sums.proj}</td>
                        <td>{this.state.sums.projreg}</td>
                        <td>{this.state.sums.playlist}</td>
                        <td>{this.state.sums.acc + this.state.sums.proj + this.state.sums.projreg + this.state.sums.playlist}</td>
                      </tr>
                    </tfoot>
                  </Table>
                </Row>
              </div>
            )
          }
        </Container>
      </div>
    )
  }
}
